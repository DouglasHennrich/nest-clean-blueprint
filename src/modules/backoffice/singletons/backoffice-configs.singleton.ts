export class BackofficeConfigsSingleton {
  public static debugLogging: boolean = false;

  public static setDebugLogging(enabled: boolean) {
    BackofficeConfigsSingleton.debugLogging = enabled;
  }
}
