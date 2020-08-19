import { Arguments } from './Arguments'
export interface IAdapter {
  executeScript: (sql: string) => Promise<void>
  insertReturning: <T>(sql: string, ...parameters: Arguments) => Promise<T>
  insertUpdateDelete: (sql: string, ...parameters: Arguments) => Promise<void>
  insertUpdateDeleteMany: (sql: string, ...parameters: Arguments) => Promise<void>
  select: <T>(sql: string, ...parameters: Arguments) => Promise<T>
}
