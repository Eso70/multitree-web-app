import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

/**
 * The whole dependency graph must resolve.
 *
 * Nothing else here catches an unregistered provider. `tsc` and `nest build`
 * only compile, and every service spec constructs its subject with `new`,
 * which bypasses the injector entirely — so a constructor parameter whose
 * provider is missing from its module compiles, passes its unit tests, and
 * then fails at boot with `UnknownDependenciesException`. That is exactly how
 * `AnalyticsReadRepository` reached `BusinessAdministrationService` without
 * being a provider of `PlatformAdminModule`.
 *
 * A default parameter value does not help: Nest resolves constructor
 * parameters from the emitted type metadata and never consults the default, so
 * `= new Thing(...)` looks optional in TypeScript while still being a required
 * injection. Only `@Optional()` makes it optional.
 *
 * Compiling the module is enough — it instantiates every provider without
 * opening a port, a database connection or a Redis client, since those connect
 * lazily.
 */
describe('AppModule dependency graph', () => {
  it('resolves every provider in every module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    // `compile()` is the assertion: it instantiates every provider and throws
    // `UnknownDependenciesException` if one cannot be resolved. Teardown is
    // best-effort because `DatabaseService.onModuleDestroy` ends a connection
    // pool that was never opened against a real server here.
    await moduleRef.close().catch(() => undefined);
  }, 60_000);
});
