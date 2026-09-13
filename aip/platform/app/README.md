# app

The React frontend for **38g-talent-search**. It renders the five-section tutorial in `src/tutorial/`, and `src/tutorial/Demo.tsx` is the to-do list every section builds on.

- `useOsdkObjects(task)` reads Ontology objects.
- `useOsdkAction(createTaskAction)` applies a plain Ontology action.
- `useOsdkAction(completeTaskAction)` applies the function-backed action.

Run and deploy this app from the repository root so the Ontology, function runtime, and frontend stay in lock-step.
