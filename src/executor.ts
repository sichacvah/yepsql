import { IAdapter } from './IAdapter'
import { Arguments, Argument } from './Arguments'
import { Query, Operation, Parameter, positionalParameter, NamedParameter } from './queries'


interface Params {
  positional: Arguments
  keyword: Record<string, Argument>
}

const procPositionalParameter = (parameter: Parameter, result: Arguments, { positional, ...rest }: Params) => {
  return [
    result.concat(positional[result.length]),
    { ...rest, positional }
  ] as [Arguments, Params]
}

const procNamedParameter = (parameter: NamedParameter, result: Arguments, { positional, keyword, ...rest }: Params) => {
  return [
    result.concat(keyword[parameter.name]),
    { ...rest, keyword, positional: ([null] as Arguments).concat(positional) }
  ] as [Arguments, Params]
}

const procParameter = (parameter: Parameter, result: Arguments, args: Params) => {
  if (parameter === positionalParameter) {
    return procPositionalParameter(parameter, result, args)
  }
  return procNamedParameter(parameter, result, args)
}

const prepareParams = (queryArgs: Params, parameters: Parameter[]) => {
  let result = [] as Arguments
  let args = queryArgs
  for (let parameterIndex = 0; parameterIndex < parameters.length; parameterIndex++) {
    const parameter = parameters[parameterIndex]
    let [nextResult, nextArgs] = procParameter(parameter, result, args)
    result = nextResult
    args = nextArgs
  }
  return result
}

export class Executor {
  private static adapter?: IAdapter
  static registerAdapter = (adapter: IAdapter) => {
    Executor.adapter = adapter
  }

  static execute = async <Result>(query: Query, params: Params): Promise<Result | void> => {
    if (!Executor.adapter) {
      throw new Error('Missing adapter, please call Executor.registerAdapter')
    }
    switch (query.operation) {
      case (Operation.InsertReturning): {
        return Executor.adapter.insertReturning(query.queryString, ...prepareParams(params, query.params))
      }
      case (Operation.InsertUpdateDelete): {
        return Executor.adapter.insertUpdateDelete(query.queryString, ...prepareParams(params, query.params))
      }
      case (Operation.InsertUpdateDeleteMany): {
        return Executor.adapter.insertUpdateDeleteMany(query.queryString, ...prepareParams(params, query.params))
      }
      case (Operation.Script): {
        return Executor.adapter.executeScript(query.queryString)
      }
      case (Operation.SelectOneRow): {
        const result = await Executor.adapter.select(query.queryString, ...prepareParams(params, query.params))
        if (Array.isArray(result) && result.length === 1) {
          return result[0]
        }
        return
      }
      case (Operation.Select): {
        return Executor.adapter.select(query.queryString, ...prepareParams(params, query.params))
      }
      default:
        throw new Error(`Operation not supported: ${query.operation}`)
    }
  }
}
