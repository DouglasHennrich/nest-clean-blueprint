/**
 * Local ESLint rules for this blueprint.
 *
 * Rules:
 *  - local/require-presenter-usage
 *    Enforces that every HTTP handler in a *.controller.ts file calls a
 *    presenter method (present, presentMany, presentWithoutRelations, or
 *    presentSuccess) before returning data. Methods that inject @Res() are
 *    exempt because they control the response pipe manually (e.g. file
 *    downloads / PDF exports).
 */

const HTTP_METHODS = new Set(["Get", "Post", "Put", "Patch", "Delete"]);
const PRESENT_CALLS = ["present", "presentMany", "presentWithoutRelations", "presentSuccess"];

/** Returns true if the node has one of the NestJS HTTP-method decorators. */
function hasHttpDecorator(node) {
  return (node.decorators ?? []).some((d) => {
    const { expression: expr } = d;
    return (
      expr.type === "CallExpression" &&
      expr.callee.type === "Identifier" &&
      HTTP_METHODS.has(expr.callee.name)
    );
  });
}

/** Returns true if any param of the function has a @Res() decorator. */
function hasResParam(funcNode) {
  return (funcNode.params ?? []).some((param) =>
    (param.decorators ?? []).some((d) => {
      const { expression: expr } = d;
      return (
        expr.type === "CallExpression" &&
        expr.callee.type === "Identifier" &&
        expr.callee.name === "Res"
      );
    }),
  );
}

/**
 * Recursively walks an AST node and returns true if it contains a CallExpression
 * whose callee is a MemberExpression matching one of the PRESENT_CALLS methods.
 * This correctly ignores commented-out code because it works on the AST, not raw text.
 */
function findPresenterCall(node) {
  if (!node || typeof node !== "object") return false;
  if (node.type === "CallExpression") {
    const { callee } = node;
    if (
      callee.type === "MemberExpression" &&
      callee.property.type === "Identifier" &&
      PRESENT_CALLS.includes(callee.property.name)
    ) {
      return true;
    }
  }
  for (const key of Object.keys(node)) {
    if (key === "parent") continue; // avoid circular reference
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && item.type) {
          if (findPresenterCall(item)) return true;
        }
      }
    } else if (child && typeof child === "object" && child.type) {
      if (findPresenterCall(child)) return true;
    }
  }
  return false;
}

/**
 * Returns true if the method has @HttpCode(204) or @HttpCode(HttpStatus.NO_CONTENT).
 * Delete and similar endpoints that return 204 don't send a body, so no presenter is needed.
 */
function hasNoContentDecorator(node) {
  return (node.decorators ?? []).some((d) => {
    const { expression: expr } = d;
    if (
      expr.type !== "CallExpression" ||
      expr.callee.type !== "Identifier" ||
      expr.callee.name !== "HttpCode"
    ) {
      return false;
    }
    const arg = expr.arguments[0];
    if (!arg) return false;
    // @HttpCode(204)
    if (arg.type === "Literal" && arg.value === 204) return true;
    // @HttpCode(HttpStatus.NO_CONTENT)
    if (
      arg.type === "MemberExpression" &&
      arg.property.type === "Identifier" &&
      arg.property.name === "NO_CONTENT"
    ) {
      return true;
    }
    return false;
  });
}

/** @type {import('eslint').Rule.RuleModule} */
const requirePresenterUsage = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce that HTTP handler methods in controllers call a presenter method before returning data.",
      recommended: false,
    },
    messages: {
      missingPresenter:
        'HTTP handler "{{name}}" must call a presenter method ' +
        "(present, presentMany, presentWithoutRelations, or presentSuccess) before returning. " +
        "If you are streaming/downloading the response manually, add @Res() to the method parameters.",
    },
    schema: [],
  },

  create(context) {
    // context.filename is the ESLint 9 API; fall back to the deprecated getter.
    const filename = context.filename ?? context.getFilename?.() ?? "";
    if (!filename.endsWith(".controller.ts")) return {};

    return {
      MethodDefinition(node) {
        if (!hasHttpDecorator(node)) return;

        const funcNode = node.value;

        // Methods that receive @Res() control the HTTP response themselves
        // (e.g. PDF/file downloads) — no presenter needed.
        if (hasResParam(funcNode)) return;

        // Methods returning 204 No Content don't send a body — no presenter needed.
        if (hasNoContentDecorator(node)) return;

        if (!funcNode.body) return;

        const callsPresenter = findPresenterCall(funcNode.body);

        if (!callsPresenter) {
          const methodName =
            node.key.type === "Identifier"
              ? node.key.name
              : String(node.key.value ?? "<anonymous>");

          context.report({
            node,
            messageId: "missingPresenter",
            data: { name: methodName },
          });
        }
      },
    };
  },
};

export default {
  rules: {
    "require-presenter-usage": requirePresenterUsage,
  },
};
