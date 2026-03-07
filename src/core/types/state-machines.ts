export interface StateMachine<S extends string, E extends string> {
  transitions: Partial<Record<S, Partial<Record<E, S>>>>;
  validate(from: S, event: E): S | null;
  transition(from: S, event: E): S;
}

export function createStateMachine<S extends string, E extends string>(
  transitions: Partial<Record<S, Partial<Record<E, S>>>>
): StateMachine<S, E> {
  return {
    transitions,
    validate(from: S, event: E): S | null {
      const stateTransitions = transitions[from];
      if (!stateTransitions) return null;
      return stateTransitions[event] ?? null;
    },
    transition(from: S, event: E): S {
      const next = this.validate(from, event);
      if (next === null) {
        throw new Error(`Invalid transition: ${from} + ${event}`);
      }
      return next;
    },
  };
}
