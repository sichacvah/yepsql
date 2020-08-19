import {
  queryNameDefinitionPattern,
  emptyPattern,
  validQueryNamePattern,
  docCommentPattern,
  variablePattern
} from './patterns'

export enum Operation {
  InsertReturning = 'InsertReturning',
  InsertUpdateDelete = 'InsertUpdateDelete',
  InsertUpdateDeleteMany = 'InsertUpdateDeleteMany',
  Script = 'Script',
  SelectOneRow = 'SelectOneRow',
  Select = 'Select'
}

export type NamedParameter = {
  name: string
}

export const positionalParameter = Symbol.for('positional')

type PositionalParameter = typeof positionalParameter

export type Parameter = NamedParameter | PositionalParameter

export interface Query {
  name: string
  queryString: string
  operation: Operation
  docs: string
  params: Parameter[]

}

interface Queries extends Record<string, Query> {}

export const extractQueriesStrings = (fileContent: string) => {
  return fileContent.split(queryNameDefinitionPattern).filter(queryString => !queryString.match(emptyPattern))
}

export const extractNameAndOperation = (name: string): [string, Operation] => {
  if (name.endsWith('<!')) {
    return [name.slice(0, -2), Operation.InsertReturning]
  }
  if (name.endsWith('*!')) {
    return [name.slice(0, -2), Operation.InsertUpdateDeleteMany]
  }
  if (name.endsWith('!')) {
    return [name.slice(0, -1), Operation.InsertUpdateDelete]
  }
  if (name.endsWith('#')) {
    return [name.slice(0, -1), Operation.Script]
  }
  if (name.endsWith('?')) {
    return [name.slice(0, -1), Operation.SelectOneRow]
  }
  return [name, Operation.Select]
}

export const extractDocsWithSql = (queryLines: string[]) => {
  let docs = ''
  let query = ''
  for (let line of queryLines) {
    const match = docCommentPattern.exec(line)
    if (match) {
      docs += match[1] + '\n'
    } else {
      query += line + '\n'
    }
  }
  return [query.trim(), docs]
}

const proceedParam = (param: string): Parameter => {
  if (param === '?') return positionalParameter
  return {
    name: param.slice(1)
  }
}

export const extractParams = (query: string) => {
  return (query.match(variablePattern) || []).map(param => proceedParam(param))
}

export const getNamedParams = (params: Parameter[]): NamedParameter[] => {
  return params.filter(param => param !== positionalParameter) as NamedParameter[]
}

export const replaceNamedParamsWithPositional = (query: string, params: Parameter[]) => {
  const namedParams = getNamedParams(params).map(named => named.name)
  const uniqNamedParams = Array.from(new Set(namedParams))

  return uniqNamedParams.reduce((query, name) => {
    return query.replace(`:${name}`, '?')
  }, query)
}

export const processQueryString = (queryString: string): [string, Query] => {
  const lines = queryString.trim().split('\n')
  const [name, operation] = extractNameAndOperation(lines[0])
  if (!name.match(validQueryNamePattern)) { 
    throw new Error('Invalid query name - ' + name)
  }
  const [query, docs] = extractDocsWithSql(lines.slice(1))
  const params = extractParams(query)

  return [name, {
    operation,
    docs,
    name,
    params,
    queryString: query
  }]
}


export const parseString = (fileContent: string): Queries => {
  const queryStrings = extractQueriesStrings(fileContent)

  return Object.fromEntries(queryStrings.map(queryString => processQueryString(queryString)))
}
