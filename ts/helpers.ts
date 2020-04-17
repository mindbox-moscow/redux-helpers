import * as Redux from "redux";
import * as actions from "redux-actions";
import { createAction as reduxCreateAction, ActionFunction1 } from "redux-actions";

type Primitive = string | number | boolean;

export interface BaseAction
{
	type: string;
}

export interface Action<TPayload> extends BaseAction
{
	payload: TPayload;
	error?: boolean;
}

/**
 * Action creator's and reducer's factory. It contains current store brunch's type and action payload's type.
 * @template TState store's current brunch type.
 * @template TPayload action's payload type.
 */
export class GuardedTypeOnlyFactory
{
	private _type: string;
	private _actionCreator: (...args: BaseAction[]) => BaseAction;

	constructor(type: string)
	{
		this._type = type;
		this._actionCreator = reduxCreateAction(this._type.toString());
	}

	public get type()
	{
		return this._type;
	}

	/**
	 * Creates an action creator.
	 * @param payload payload for an action. If not passed null will be used as payload.
	 */
	public createAction(): BaseAction
	{
		return this._actionCreator();
	}

	
	/**
	 * Creates a reducer, bounded to concrete type.
	 * @param reducer reducer.
	 * @param initialState initialState.
	 */
	public createReducer<TState>(reducer: (state: TState, action: BaseAction) => TState, initialState: TState) : GuardedReducer<undefined, TState>
	{
		const actionReducer = (state: TState = initialState, action: BaseAction) =>
		{
			if (is(action, this._type))
				return reducer(state, action);

			return state;
		};

		return new GuardedReducer<undefined, TState>(this._type, actionReducer);
	}
}

export class GuardedFactory<TPayload>
{
	private _type: string;
	private _actionCreator: (...args: Array<TPayload>) => Action<TPayload>;

	constructor(type: string)
	{
		this._type = type;
		const typeWrapper = (func: ActionFunction1<TPayload, actions.Action<TPayload>>) => {
			return (arg: TPayload): Action<TPayload> => { 
				const action = func(arg)
				return { ...action, payload: action.payload! }
			}
		}
		this._actionCreator = typeWrapper(reduxCreateAction<TPayload>(this._type.toString()));
	}

	public get type()
	{
		return this._type;
	}

	/**
	 * Creates an action creator.
	 * @param payload payload for an action. If not passed null will be used as payload.
	 */
	public createAction(payload: TPayload): Action<TPayload>
	{
		return this._actionCreator(payload);
	}

	
	/**
	 * Creates a reducer, bounded to concrete type.
	 * @param reducer reducer.
	 * @param initialState initialState.
	 */
	public createReducer<TState>(reducer: (state: TState, action: Action<TPayload>) => TState, initialState: TState)
	{
		const actionReducer = (state: TState = initialState, action: Action<TPayload>) =>
		{
			if (is(action, this._type))
				return reducer(state, action);

			return state;
		};

		return new GuardedReducer<TPayload, TState>(this._type, actionReducer);
	}

	/**
	 * Creates a reducer that replaces current state with payload.
	 * Can be used only for primitive types or array of primitive types.
	 * This method is helpful when you use it with combineReducers.
	 * It helps to remove boilerplate code like "MY_ACTION.createReducer<boolean>((state, action) => action.payload)".
	 * @param initialState initialState.
	 */
	public createPrimitiveReducer<TState extends undefined | TPayload & (Primitive | Array<Primitive>)>(initialState: TState)
	{
		return this.createReducer<TPayload>((_, action) => action.payload, initialState!);
	}
}

export interface GuardedReducerBase<TPayload, TState>
{
	type: string;
	reducer: (state: TState, action: Action<TPayload>) => TState;
}

class GuardedReducer<TPayload, TState> implements GuardedReducerBase<TPayload, TState>
{
	private _reducer: (state: TState, action: Action<TPayload>) => TState;
	private _type: string;

	constructor(
		type: string,
		reducer: (state: TState, action: Action<TPayload>) => TState)
	{
		this._type = type;
		this._reducer = reducer;
	}

	public get reducer()
	{
		return this._reducer;
	}

	public get type()
	{
		return this._type;
	}
}

/**
* Join a set of reducers that work with same state's branch
* (unlike combine where each reducer work with different branches).
* 
* You can register a defaultReducer that will be triggered even if an action
* was already processed. Please avoid such registrations.
* @param initialState initial state.
* @param actionReducers a set of reducers with type.
* @param defaultReducer default reducer.
*/
export const joinReducers = <TState, TPayload>(
		initialState: TState,
		actionReducers: GuardedReducerBase<any, TState>[],
		defaultReducer?: (state: TState, action: Action<TPayload>) => TState) =>
	{
		const actionReducerMap: Redux.ReducersMapObject = {};

		for (let actionReducer of actionReducers)
		{
			if (actionReducerMap[actionReducer.type] != null)
				throw new Error(`Reducer with type "${actionReducer.type}" had already been registered.`);

			const typeWrapper = (func: (state: TState, action: Action<any>) => TState) => {
				return (state: TState, action: Redux.AnyAction): TState => {
					return func(state, action as Action<any>);
				}
			}
			actionReducerMap[actionReducer.type] = typeWrapper(actionReducer.reducer);
		}

		const reducer = (
				currentState: TState = initialState,
				action: Action<any>): TState =>
			{
				const actionReducer = actionReducerMap[action.type];

				let nextState = currentState;
				if (actionReducer != null)
					nextState = actionReducer(nextState, action);
				if (defaultReducer != null)
					nextState = defaultReducer(nextState, action);

				return nextState;
			};

		return reducer;
	};

/**
 * Check that FSA (Flux Standard Action) has required type.
 * @param action action to check.
 * @param type required action type.
 * @template TPayload action's payload type.
 */
const is = (
	action: BaseAction,
	type: string): action is BaseAction => action.type === type;

/**
 * Create action creator's and action reducer's factory.
 * @param type action's type.
 * @template TPayload action's payload type.
 */
export const createFactory = <TPayload>(type: string) => new GuardedFactory<TPayload>(type);
export const createTypeOnlyFactory = (type: string) => new GuardedTypeOnlyFactory(type);
