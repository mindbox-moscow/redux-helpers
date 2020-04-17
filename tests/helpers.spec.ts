import * as Helpers from "../ts/helpers";

describe("Redux helpers tests",
	() =>
	{
		describe("GuardedFactory tests",
		() =>
		{
			it("'type'-getter returns type of action",
				() =>
				{
					const anActionFactory = Helpers.createFactory<string>("ACTION");

					const anAction = anActionFactory.createAction("abacaba");


					expect(anAction.payload).toEqual("abacaba");
					expect(anAction.type).toEqual(anActionFactory.type);
					expect(anActionFactory.type).toEqual("ACTION");
				});

			it("createAction can use empty payload",
				() =>
				{
					const anActionFactory = Helpers.createFactory<string | undefined>("ACTION");
					const anAction = anActionFactory.createAction(undefined);

					expect(anAction.payload).toBeUndefined();
				});
				
			it("createAction with payload === false doesn't change action's payload",
				() =>
				{
					const anActionFactory = Helpers.createFactory<boolean>("ACTION");

					const anAction = anActionFactory.createAction(false);

					expect(anAction.payload).toEqual(false);
				});

			it("reducer processes actions from same factory",
				() =>
				{
					type State = undefined |
					{
						a: string | null;
					}

					const anActionFactory = Helpers.createFactory<string>("ACTION");

					const anAction = anActionFactory.createAction("abacaba");
					const aReducer = anActionFactory.createReducer<State>((state, action) => ({ a: action.payload }), undefined);


					const expectedState = aReducer.reducer({a: null}, anAction);


					expect(expectedState).toBeDefined();
					expect(expectedState!.a).toEqual("abacaba");
				});

			it("primitive reducer set primtive type state",
				() =>
				{
					const anActionFactory = Helpers.createFactory<string>("ACTION");

					const anAction = anActionFactory.createAction("payload");
					const aReducer = anActionFactory.createPrimitiveReducer("defaultState");


					const expectedState = aReducer.reducer("initialState", anAction);


					expect(expectedState).toEqual("payload");
				});

			it("primitive reducer set array of primtive types state",
				() =>
				{
					const anActionFactory = Helpers.createFactory<string[]>("ACTION");

					const anAction = anActionFactory.createAction(["payload1", "payload2"]);
					const aReducer = anActionFactory.createPrimitiveReducer(["defaultState"]);


					const expectedState = aReducer.reducer(["initialState"], anAction);


					expect(expectedState).toEqual(["payload1", "payload2"]);
				});

			it("primitive reducer sets default state if state is undefined",
				() =>
				{
					const anAnotherActionFactory = Helpers.createFactory<string>("ANOTHER_ACTION");
					const anActionFactory = Helpers.createFactory<string | undefined>("ACTION");

					const anActionForAnotherReducer = anAnotherActionFactory.createAction("payload");
					const aReducer = anActionFactory.createPrimitiveReducer<string | undefined>("defaultState");


					const expectedState = aReducer.reducer(undefined, anActionForAnotherReducer);


					expect(expectedState).toEqual("defaultState");
				});

			it("reducers returns not modified state for 'misstyped' action",
				() =>
				{
					const alphaActionFactory = Helpers.createFactory<string | undefined>("ALPHA");
					const betaActionFactory = Helpers.createFactory<string>("BETA");

					const alphaReducer = alphaActionFactory.createReducer<string | undefined>(
						(state, action) => action.payload!, undefined);

					const betaAction = betaActionFactory.createAction("B");


					const actualState = alphaReducer.reducer("abacaba", betaAction);


					expect(actualState).toEqual("abacaba");
				});

			it("reducer returns initial modified state for 'mistyped' action",
				() =>
				{
					const alphaActionFactory = Helpers.createFactory<string>("ALPHA");
					const betaActionFactory = Helpers.createFactory<string>("BETA");

					const alphaReducer = alphaActionFactory.createReducer<string | undefined>(
						(state, action) => action.payload,
						"initialState");

					const betaAction = betaActionFactory.createAction("B");


					const actualState = alphaReducer.reducer(undefined, betaAction);


					expect(actualState).toEqual("initialState");
				});
				
			it("GuardedReducer's reducer with initialState === true doesn't change state on unexpected actions", 
				() => 
				{
					const factory = Helpers.createFactory<boolean>("FACTORY");
					
					const reducer = factory.createReducer<boolean>(
						(state, action) => action.payload,
						true
					).reducer;
					
					const actualState = reducer(false, { type: "@@INIT", payload: false });
					
					expect(actualState).toEqual(false);
				});
		});

		describe("joinReducers tests",
			() =>
			{
				it("Reducers joint works correct",
					() =>
					{
						interface State
						{
							a: string;
						}

						const firstActionFactory = Helpers.createFactory<string>("FIRST_ACTION");
						const secondActionFactory = Helpers.createFactory<string>("SECOND_ACTION");


						const jointReducer = Helpers.joinReducers(
							{ a: "" },
							[
								firstActionFactory.createReducer<State | undefined>((state, action) => ({ a: action.payload! }), undefined),
								secondActionFactory.createReducer<State | undefined>((state, action) => ({ a: action.payload!.toUpperCase() }), undefined)
							]);

						const firstState = jointReducer(undefined, secondActionFactory.createAction("abacaba"));
						const secondState = jointReducer(firstState, firstActionFactory.createAction("ololo"));

						expect(firstState).toBeDefined()
						expect(firstState!.a).toEqual("ABACABA");
						expect(secondState).toBeDefined()
						expect(secondState!.a).toEqual("ololo");
					});

				it("Default reducer have been used",
					() =>
					{
						interface State
						{
							a: string | null;
							b: string | null;
						}

						const actionFactory = Helpers.createFactory<string>("ACTION");
						const reducer = actionFactory.createReducer<State | undefined>((state, action) => ({ a: action.payload, b: null }), undefined);

						const defaultActionFactory = Helpers.createFactory<string>("DEFAULT_ACTION");
						const defaultReducer = (state: State | undefined, action: Helpers.Action<string>) => ({ a: state!.a, b: action.payload });

						const jointReducer = Helpers.joinReducers(
							{ a: null, b: null },
							[reducer],
							defaultReducer);

						const actualState = jointReducer({ a: "AAA", b: null }, defaultActionFactory.createAction("BBB"));


						expect(actualState).toEqual({ a: "AAA", b: "BBB" });
					});

				it("Impossible to register two reducers for same state and action",
					() =>
					{
						interface State
						{
						}

						const actionFactory = Helpers.createFactory<string>("ACTION");
						const aReducer = actionFactory.createReducer<State | undefined>(() => ({}), undefined);
						const bReducer = actionFactory.createReducer<State | undefined>(() => ({}), undefined);


						expect(() => Helpers.joinReducers({}, [aReducer, bReducer]))
							.toThrowError("Reducer with type \"ACTION\" had already been registered.");
					});

				it("Returns initial state in case of undefined current state",
					() =>
					{
						const initialState = "abacaba";
						const jointReducer = Helpers.joinReducers(initialState, []);


						const actualState = jointReducer(undefined, { type: "ACTION", payload: undefined});


						expect(actualState).toEqual(initialState);
					});

				it("JointReducer with initialState === true doesn't change state on unexpected actions",
					() =>
					{
						const jointReducer = Helpers.joinReducers(true, []);

						const currentState = false;
						const nextState = jointReducer(false, { type: "ACTION", payload: undefined });

						expect(nextState).toEqual(currentState);
					});
			});
	});
