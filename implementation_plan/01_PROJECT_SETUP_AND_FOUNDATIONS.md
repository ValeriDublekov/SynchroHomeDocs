# Step 01: Project Setup & Clean Architecture Foundations

## 1. Objective
Establish the foundational solution structure for the **RemindCore** backend using .NET 9, enforcing Clean Architecture boundaries, strict compiler settings, standard dependency injection, and uniform result handling.

---

## 2. Solution Structure
Organize the solution into distinct projects following strict dependency boundaries:

```
src/
  ├── RemindCore.Domain/          # Pure domain models, enums, value objects, exceptions (0 dependencies)
  ├── RemindCore.Application/     # Use cases, interfaces (repositories, clock, dispatchers), DTOs
  ├── RemindCore.Infrastructure/  # EF Core, PostgreSQL, Quartz.NET, Firebase FCM client, iCal generator
  └── RemindCore.Api/             # ASP.NET Core endpoints, middlewares, filters, Program.cs
tests/
  ├── RemindCore.UnitTests/       # Domain calculation & business rule tests (fast, in-memory)
  └── RemindCore.IntegrationTests/# WebApplicationFactory & database integration tests
```

---

## 3. SOLID & Code Standards
1. **Strict Compiler Settings**: Enable `<Nullable>enable</Nullable>` and `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` in `Directory.Build.props`.
2. **Small Methods & Types**: Every class must address a single concern. For domain entities, encapsulate state mutations within private setters and expressive domain methods (e.g., `occurrence.MarkCompleted(completedAt, timeProvider)`).
3. **Result Pattern**: Use a functional `Result<T>` / `Result` wrapper to avoid using exceptions for standard business branch validation (e.g., invalid recurrence interval).

---

## 4. Key Deliverables
- [ ] Create `RemindCore.sln` with the 6 projects.
- [ ] Create `Directory.Build.props` with C# 13 and nullable reference type enforcement.
- [ ] Implement `IDateTimeProvider` abstraction in `Application` and `SystemDateTimeProvider` in `Infrastructure` to guarantee deterministic testing across all calculations.
- [ ] Implement standard `Result<T>` and `Error` records for uniform error handling.
- [ ] Configure standard DI extension methods (`AddApplicationServices()`, `AddInfrastructureServices()`).

---

## 5. Automated Tests
- **Unit Tests**:
  - `ResultTests`: Verify success/failure unwrapping and error aggregation.
  - `SystemDateTimeProviderTests`: Verify UTC returns.
- **Verification Command**:
  ```bash
  dotnet build RemindCore.sln -c Release
  dotnet test tests/RemindCore.UnitTests
  ```

---

## 6. Living Documentation Checklist
- Add `docs/architecture/DEPENDENCY_RULES.md` (under 60 lines) documenting the dependency flow: `Api -> Infrastructure -> Application -> Domain`.
- Note: Domain must remain 100% free of external NuGet packages other than base abstractions.
