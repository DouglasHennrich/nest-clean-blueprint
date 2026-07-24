import { Node, Project, SourceFile, SyntaxKind } from 'ts-morph';
import { Violation } from '../types';

const NESTJS_EXCEPTIONS = [
  'NotFoundException', 'BadRequestException', 'ForbiddenException',
  'UnauthorizedException', 'ConflictException', 'InternalServerErrorException',
  'UnprocessableEntityException', 'HttpException', 'NotAcceptableException',
  'GoneException', 'PayloadTooLargeException', 'UnsupportedMediaTypeException',
  'ServiceUnavailableException', 'GatewayTimeoutException',
];

function checkResult001(sourceFile: SourceFile, violations: Violation[]) {
  const filePath = sourceFile.getFilePath();
  sourceFile.getClasses().forEach(cls => {
    if (cls.isAbstract()) return;
    cls.getMethods().forEach(method => {
      if (!['execute', 'handle'].includes(method.getName())) return;
      const returnTypeNode = method.getReturnTypeNode();
      if (!returnTypeNode) return;
      const returnType = returnTypeNode.getText();
      if (returnType.startsWith('Promise<') && !returnType.includes('Result<')) {
        violations.push({
          file: filePath, line: method.getStartLineNumber(),
          rule: 'RESULT-001', severity: 'CRITICAL',
          detail: `Method '${method.getName()}' returns '${returnType}' — must return 'Promise<Result<...>>'`,
        });
      }
    });
  });
}

function checkResult002(sourceFile: SourceFile, violations: Violation[]) {
  const filePath = sourceFile.getFilePath();
  sourceFile.getClasses().forEach(cls => {
    if (cls.isAbstract()) return;
    cls.getMethods().forEach(method => {
      // Only the use-case entry points must never throw — they return Result.
      // Internal/infra helper methods (rate limiters, crypto, boundary re-throws
      // of AbstractApplicationException for HTTP status) may legitimately throw.
      if (!['execute', 'handle'].includes(method.getName())) return;
      method.getDescendantsOfKind(SyntaxKind.ThrowStatement).forEach(throwStmt => {
        violations.push({
          file: filePath, line: throwStmt.getStartLineNumber(),
          rule: 'RESULT-002', severity: 'CRITICAL',
          detail: `'throw' inside service entry point '${method.getName()}' — use Result.fail(new SomeException()) instead`,
        });
      });
    });
  });
}

function checkException001(sourceFile: SourceFile, violations: Violation[]) {
  const filePath = sourceFile.getFilePath();
  sourceFile.getImportDeclarations().forEach(imp => {
    if (imp.getModuleSpecifierValue() !== '@nestjs/common') return;
    const imported = imp.getNamedImports()
      .map(n => n.getName())
      .filter(n => NESTJS_EXCEPTIONS.includes(n));
    if (imported.length > 0) {
      violations.push({
        file: filePath, line: imp.getStartLineNumber(),
        rule: 'EXCEPTION-001', severity: 'HIGH',
        detail: `NestJS built-in exceptions in service: [${imported.join(', ')}] — extend AbstractApplicationException instead`,
      });
    }
  });
}

function checkPresenter002(sourceFile: SourceFile, violations: Violation[]) {
  const filePath = sourceFile.getFilePath();
  sourceFile.getClasses().forEach(cls => {
    if (cls.isAbstract()) return;
    cls.getMethods().forEach(method => {
      method.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(callExpr => {
        const expr = callExpr.getExpression();
        if (Node.isPropertyAccessExpression(expr) && expr.getName() === 'present') {
          violations.push({
            file: filePath, line: callExpr.getStartLineNumber(),
            rule: 'PRESENTER-002', severity: 'CRITICAL',
            detail: `'.present()' called inside service method '${method.getName()}' — presenters are exclusive to controllers`,
          });
        }
      });
    });
  });
}

// ENTITY-001: services must expose domain interfaces (I*Model), never *Entity types.
// Flags execute()/handle() return types containing an *Entity, and AbstractService<...>
// heritage type arguments referencing an *Entity.
const ENTITY_TYPE = /\b[A-Z]\w*Entity\b/;

function checkEntity001(sourceFile: SourceFile, violations: Violation[]) {
  const filePath = sourceFile.getFilePath();
  sourceFile.getClasses().forEach(cls => {
    // execute()/handle() return type
    if (!cls.isAbstract()) {
      cls.getMethods().forEach(method => {
        if (!['execute', 'handle'].includes(method.getName())) return;
        const returnTypeNode = method.getReturnTypeNode();
        if (!returnTypeNode) return;
        const returnType = returnTypeNode.getText();
        const entity = returnType.match(ENTITY_TYPE);
        if (entity) {
          violations.push({
            file: filePath, line: method.getStartLineNumber(),
            rule: 'ENTITY-001', severity: 'HIGH',
            detail: `Method '${method.getName()}' returns '${returnType}' exposing entity '${entity[0]}' — return the domain interface (e.g. 'I${entity[0].replace(/Entity$/, '')}Model') instead of the ORM entity`,
          });
        }
      });
    }

    // AbstractService<Input, Output> heritage type arguments
    const heritage = cls.getExtends();
    if (!heritage) return;
    if (!heritage.getExpression().getText().startsWith('AbstractService')) return;
    heritage.getTypeArguments().forEach(arg => {
      const text = arg.getText();
      const entity = text.match(ENTITY_TYPE);
      if (entity) {
        violations.push({
          file: filePath, line: heritage.getStartLineNumber(),
          rule: 'ENTITY-001', severity: 'HIGH',
          detail: `AbstractService generic argument '${text}' exposes entity '${entity[0]}' — use the domain interface (e.g. 'I${entity[0].replace(/Entity$/, '')}Model') instead of the ORM entity`,
        });
      }
    });
  });
}

// Heuristic: a class is an error/exception when its name ends in Error/Exception,
// or it extends a known error base (Error / AbstractApplicationException / NestJS built-in).
function isErrorClass(cls: import('ts-morph').ClassDeclaration): boolean {
  const name = cls.getName() ?? '';
  if (/(?:Error|Exception)$/.test(name)) return true;
  const ext = cls.getExtends()?.getExpression().getText();
  if (!ext) return false;
  return ext === 'Error' || ext === 'AbstractApplicationException' || NESTJS_EXCEPTIONS.includes(ext);
}

// ERROR-LOC-001: error/exception classes must live in the module's 'errors/' folder,
// never inline in a service (or any non-errors file).
function checkErrorLocation001(sourceFile: SourceFile, violations: Violation[]) {
  const filePath = sourceFile.getFilePath();
  if (filePath.includes('/errors/')) return;
  sourceFile.getClasses().forEach(cls => {
    if (cls.isAbstract()) return;
    if (!isErrorClass(cls)) return;
    violations.push({
      file: filePath, line: cls.getStartLineNumber(),
      rule: 'ERROR-LOC-001', severity: 'HIGH',
      detail: `Error class '${cls.getName()}' declared outside 'errors/' — move it to the module's 'errors/' folder, one error per file (e.g. 'errors/${cls.getName()}.exception.ts')`,
    });
  });
}

// ERROR-LOC-002: an 'errors/' file must declare a single error class (one per file).
function checkErrorOnePerFile002(sourceFile: SourceFile, violations: Violation[]) {
  const filePath = sourceFile.getFilePath();
  const errorClasses = sourceFile.getClasses().filter(cls => !cls.isAbstract() && isErrorClass(cls));
  if (errorClasses.length <= 1) return;
  errorClasses.slice(1).forEach(cls => {
    violations.push({
      file: filePath, line: cls.getStartLineNumber(),
      rule: 'ERROR-LOC-002', severity: 'HIGH',
      detail: `File declares ${errorClasses.length} error classes — one error per file. Move '${cls.getName()}' to its own file (e.g. 'errors/${cls.getName()}.exception.ts')`,
    });
  });
}

// EXCEPTION-002: exception classes must extend AbstractApplicationException, never
// the native Error (or anything else). Runs on *.exception.ts files.
function checkException002(sourceFile: SourceFile, violations: Violation[]) {
  const filePath = sourceFile.getFilePath();
  sourceFile.getClasses().forEach(cls => {
    if (cls.isAbstract()) return;
    const heritage = cls.getExtends();
    const heritageName = heritage?.getExpression().getText();
    if (heritageName === 'AbstractApplicationException') return;
    violations.push({
      file: filePath, line: cls.getStartLineNumber(),
      rule: 'EXCEPTION-002', severity: 'HIGH',
      detail: `Exception '${cls.getName()}' extends '${heritageName ?? 'nothing'}' — must extend 'AbstractApplicationException'`,
    });
  });
}

// RESULT-003: Service method returning Promise<T | null> instead of Promise<Result<T>>
function checkResult003(sourceFile: SourceFile, violations: Violation[]) {
  const filePath = sourceFile.getFilePath();
  sourceFile.getClasses().forEach(cls => {
    if (cls.isAbstract()) return;
    cls.getMethods().forEach(method => {
      if (!['execute', 'handle'].includes(method.getName())) return;
      const returnTypeNode = method.getReturnTypeNode();
      if (!returnTypeNode) return;
      const returnType = returnTypeNode.getText();
      if (/Promise<.+\|\s*null>/.test(returnType) && !returnType.includes('Result<')) {
        violations.push({
          file: filePath, line: method.getStartLineNumber(),
          rule: 'RESULT-003', severity: 'HIGH',
          detail: `Method '${method.getName()}' returns '${returnType}' — use 'Promise<Result<T>>' with Result.fail() for absence`,
        });
      }
    });
  });
}

// VALIDATEDTO-001: execute()/handle() receiving a payload must validate it before use.
// This repo's convention (src/@shared/classes/service.ts) is a *static* helper on
// AbstractService — `AbstractService.validateDto(schema, payload)` — called at the
// top of execute()/handle(), NOT a per-class instance `validateDto` method. Both
// forms are accepted so a service written either way passes.
function checkValidateDto001(sourceFile: SourceFile, violations: Violation[]) {
  const filePath = sourceFile.getFilePath();
  sourceFile.getClasses().forEach(cls => {
    if (cls.isAbstract()) return;
    const executeMethod = cls
      .getMethods()
      .find(method => ['execute', 'handle'].includes(method.getName()));
    if (!executeMethod) return;
    if (executeMethod.getParameters().length === 0) return; // no payload — nothing to validate

    const hasInstanceValidateDto = cls.getMethods().some(method => method.getName() === 'validateDto');
    const hasStaticValidateDtoCall = executeMethod
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .some(callExpr => {
        const expr = callExpr.getExpression();
        return (
          Node.isPropertyAccessExpression(expr) &&
          expr.getName() === 'validateDto' &&
          expr.getExpression().getText() === 'AbstractService'
        );
      });

    if (!hasInstanceValidateDto && !hasStaticValidateDtoCall) {
      violations.push({
        file: filePath, line: executeMethod.getStartLineNumber(),
        rule: 'VALIDATEDTO-001', severity: 'HIGH',
        detail: `'${cls.getName()}.${executeMethod.getName()}()' receives a payload but never validates it — call 'AbstractService.validateDto(schema, payload)' (or define an instance 'validateDto' method) at the top of ${executeMethod.getName()}() and return its Result.fail() on failure`,
      });
    }
  });
}

// REPO-002: repository must declare an 'I'-prefixed abstract class extending
// AbstractRepository, and the concrete class must extend that abstract class
function checkRepo002(sourceFile: SourceFile, violations: Violation[]) {
  const filePath = sourceFile.getFilePath();
  const classes = sourceFile.getClasses();

  const interfaceClass = classes.find(cls => {
    if (!cls.isAbstract()) return false;
    const name = cls.getName();
    if (!name || !name.startsWith('I')) return false;
    const heritage = cls.getExtends();
    return heritage ? heritage.getExpression().getText().startsWith('AbstractRepository') : false;
  });

  if (!interfaceClass) {
    violations.push({
      file: filePath, line: 1,
      rule: 'REPO-002', severity: 'CRITICAL',
      detail: `Repository must declare an abstract class prefixed with 'I' extending 'AbstractRepository<Entity, Model>' (e.g. 'export abstract class IXxxRepository extends AbstractRepository<...>')`,
    });
    return;
  }

  classes.forEach(cls => {
    if (cls.isAbstract() || cls === interfaceClass) return;
    const heritage = cls.getExtends();
    const heritageName = heritage?.getExpression().getText();
    if (!heritageName || !heritageName.startsWith('I')) {
      violations.push({
        file: filePath, line: cls.getStartLineNumber(),
        rule: 'REPO-002', severity: 'CRITICAL',
        detail: `Concrete repository class '${cls.getName()}' must extend '${interfaceClass.getName()}' — not '${heritageName ?? 'nothing'}'`,
      });
    }
  });
}

// NAMING-004: 'I'-prefixed interfaces must end with the 'Model' suffix
function checkNaming004(sourceFile: SourceFile, violations: Violation[]) {
  const filePath = sourceFile.getFilePath();
  sourceFile.getInterfaces().forEach(iface => {
    const name = iface.getName();
    if (!name.startsWith('I')) return;
    if (!name.endsWith('Model')) {
      violations.push({
        file: filePath, line: iface.getStartLineNumber(),
        rule: 'NAMING-004', severity: 'HIGH',
        detail: `Interface '${name}' must end with suffix 'Model' — rename to '${name}Model'`,
      });
    }
  });
}

// PARAM-001: any named function or class method with 2+ parameters must accept a
// single object ("criteria/params") instead of multiple positional parameters.
// Skips constructors (DI), parameters with decorators (@Body/@Param/@CurrentUser/etc.),
// and inline arrow/function-expression callbacks (map/reduce/relation lambdas).
// NestJS framework-contract methods invoked positionally by the framework via
// `implements` — their signatures are fixed and must not be converted to an object.
const FRAMEWORK_METHODS = new Set(['catch', 'intercept', 'use', 'canActivate', 'transform']);

function checkParam001(sourceFile: SourceFile, violations: Violation[]) {
  const filePath = sourceFile.getFilePath();

  const flag = (name: string, params: import('ts-morph').ParameterDeclaration[], line: number) => {
    if (params.length < 2) return;
    // NestJS lifecycle/contract methods (ExceptionFilter.catch, NestInterceptor.intercept,
    // NestMiddleware.use, CanActivate.canActivate, PipeTransform.transform) are exempt.
    const methodName = name.includes('.') ? name.split('.').pop()! : name;
    if (FRAMEWORK_METHODS.has(methodName)) return;
    // Framework-driven params (controllers, DI) are exempt.
    if (params.some(p => p.getDecorators().length > 0)) return;
    violations.push({
      file: filePath, line,
      rule: 'PARAM-001', severity: 'HIGH',
      detail: `'${name}' declares ${params.length} positional parameters — pass a single object instead (e.g. '${name}(params: { ... })'). Project convention: any function with more than one parameter must receive an object.`,
    });
  };

  // Standalone function declarations
  sourceFile.getFunctions().forEach(fn => {
    const name = fn.getName() ?? '<anonymous>';
    flag(name, fn.getParameters(), fn.getStartLineNumber());
  });

  // Class methods (getMethods excludes constructors; covers abstract signatures too)
  sourceFile.getClasses().forEach(cls => {
    cls.getMethods().forEach(method => {
      flag(`${cls.getName() ?? 'Class'}.${method.getName()}`, method.getParameters(), method.getStartLineNumber());
    });
  });
}

// CONTROLLER-001: a controller may inject at most one service and one presenter.
// Deps are classified by constructor-parameter type name suffix ('Service' / 'Presenter').
// When more than one service is needed, the primary service must inject the others
// as its own dependencies — not the controller.
function checkController001(sourceFile: SourceFile, violations: Violation[]) {
  const filePath = sourceFile.getFilePath();
  sourceFile.getClasses().forEach(cls => {
    if (!cls.getDecorator('Controller')) return;
    const ctor = cls.getConstructors()[0];
    if (!ctor) return;

    const services: string[] = [];
    const presenters: string[] = [];
    ctor.getParameters().forEach(param => {
      const typeName = param.getTypeNode()?.getText() ?? '';
      if (typeName.endsWith('Service')) services.push(typeName);
      else if (typeName.endsWith('Presenter')) presenters.push(typeName);
    });

    if (services.length > 1) {
      violations.push({
        file: filePath, line: ctor.getStartLineNumber(),
        rule: 'CONTROLLER-001', severity: 'HIGH',
        detail: `Controller '${cls.getName()}' injects ${services.length} services [${services.join(', ')}] — a controller may inject only 1 service. The primary service must inject the others as its own dependencies.`,
      });
    }
    if (presenters.length > 1) {
      violations.push({
        file: filePath, line: ctor.getStartLineNumber(),
        rule: 'CONTROLLER-001', severity: 'HIGH',
        detail: `Controller '${cls.getName()}' injects ${presenters.length} presenters [${presenters.join(', ')}] — a controller may inject only 1 presenter.`,
      });
    }
  });
}

export function runControllerAstRules(controllerFiles: string[]): Violation[] {
  const violations: Violation[] = [];
  if (controllerFiles.length === 0) return violations;

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: { skipLibCheck: true },
  });

  for (const file of controllerFiles) {
    try { project.addSourceFileAtPath(file); } catch { /* skip unreadable */ }
  }

  for (const sourceFile of project.getSourceFiles()) {
    checkController001(sourceFile, violations);
  }

  return violations;
}

export function runParamRules(files: string[]): Violation[] {
  const violations: Violation[] = [];
  if (files.length === 0) return violations;

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: { skipLibCheck: true },
  });

  for (const file of files) {
    try { project.addSourceFileAtPath(file); } catch { /* skip unreadable */ }
  }

  for (const sourceFile of project.getSourceFiles()) {
    checkParam001(sourceFile, violations);
  }

  return violations;
}

export function runRepositoryAstRules(repositoryFiles: string[]): Violation[] {
  const violations: Violation[] = [];
  if (repositoryFiles.length === 0) return violations;

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: { skipLibCheck: true },
  });

  for (const file of repositoryFiles) {
    try { project.addSourceFileAtPath(file); } catch { /* skip unreadable */ }
  }

  for (const sourceFile of project.getSourceFiles()) {
    checkRepo002(sourceFile, violations);
  }

  return violations;
}

export function runInterfaceNamingRule(files: string[]): Violation[] {
  const violations: Violation[] = [];
  if (files.length === 0) return violations;

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: { skipLibCheck: true },
  });

  for (const file of files) {
    try { project.addSourceFileAtPath(file); } catch { /* skip unreadable */ }
  }

  for (const sourceFile of project.getSourceFiles()) {
    checkNaming004(sourceFile, violations);
  }

  return violations;
}

export function runAstRules(serviceFiles: string[]): Violation[] {
  const violations: Violation[] = [];
  if (serviceFiles.length === 0) return violations;

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: { skipLibCheck: true },
  });

  for (const file of serviceFiles) {
    try { project.addSourceFileAtPath(file); } catch { /* skip unreadable */ }
  }

  for (const sourceFile of project.getSourceFiles()) {
    checkResult001(sourceFile, violations);
    checkResult002(sourceFile, violations);
    checkResult003(sourceFile, violations);
    checkException001(sourceFile, violations);
    checkPresenter002(sourceFile, violations);
    checkValidateDto001(sourceFile, violations);
    checkEntity001(sourceFile, violations);
  }

  return violations;
}

export function runExceptionAstRules(exceptionFiles: string[]): Violation[] {
  const violations: Violation[] = [];
  if (exceptionFiles.length === 0) return violations;

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: { skipLibCheck: true },
  });

  for (const file of exceptionFiles) {
    try { project.addSourceFileAtPath(file); } catch { /* skip unreadable */ }
  }

  for (const sourceFile of project.getSourceFiles()) {
    checkException002(sourceFile, violations);
    checkErrorOnePerFile002(sourceFile, violations);
  }

  return violations;
}

export function runErrorLocationRules(files: string[]): Violation[] {
  const violations: Violation[] = [];
  const targets = files.filter(f => !f.includes('/errors/'));
  if (targets.length === 0) return violations;

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: { skipLibCheck: true },
  });

  for (const file of targets) {
    try { project.addSourceFileAtPath(file); } catch { /* skip unreadable */ }
  }

  for (const sourceFile of project.getSourceFiles()) {
    checkErrorLocation001(sourceFile, violations);
  }

  return violations;
}
