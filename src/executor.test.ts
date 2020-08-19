import { Executor } from './executor'
import { IAdapter } from './IAdapter'
import { parseString } from './queries'

const sql = `
-- name: publishBlog<!
insert into blogs (
  userid,
  title,
  content,
  published
)
values (
  :userid,
  :title,
  :content,
  :published,
)

-- name: removeTwoBlogs*!
delete from blogs where blogid = :blogid1
delete from blogs where blogid = :blogid2

-- name: executeScript#
select * from blogs

-- name: removeBlog!
-- Remove a blog from the database
delete from blogs where blogid = :blogid;

-- name: getCurrentUser?
select * from users where userid = :userid

-- name: getUserBlogs
-- Get blogs authored by a user.
  select title,
         published
    from blogs
   where userid = :userid
order by published desc;
`

const PlainAdapter: IAdapter = {
  executeScript: async (sql) => {
    console.log('EXECUTE_SCRIPT')
    console.log(sql)
  },
  insertReturning: async (sql, ...parameters) => {
    console.log('INSERT_RETURNING')
    console.log(sql)
    console.log('parameters: ', parameters)
    return parameters as any
  },
  insertUpdateDelete: async (sql, ...parameters) => {
    console.log('INSERT_UPDATE_DELETE')
    console.log(sql)
    console.log('parameters: ', parameters)
  },
  insertUpdateDeleteMany: async (sql, ...parameters) => {
    console.log('INSERT_UPDATE_DELETE_MANY')
    console.log(sql)
    console.log('parameters: ', parameters)
  },
  select: async (sql, ...parameters) => {
    console.log('SELECT')
    console.log(sql)
    console.log('parameters: ', parameters)
    return parameters as any
  }
}


describe('executor', () => {
  Executor.registerAdapter(PlainAdapter)
  const queries = parseString(sql)

  it('should insert returning', async () => {
    const result = await Executor.execute(queries.publishBlog, {
      keyword: {
        userid: 10,
        title: 'title',
        content: 'content',
        published: true
      },
      positional: []
    })
    expect(result).toEqual([ 10, 'title', 'content', true ])
  })

  it('should insert execute script', async () => {
    PlainAdapter.executeScript = jest.fn()

    await Executor.execute(queries.executeScript, {keyword: {}, positional: []})
    expect(PlainAdapter.executeScript).toHaveBeenCalledTimes(1)
    expect(PlainAdapter.executeScript).toHaveBeenCalledWith(queries.executeScript.queryString)
  })

  it('should delete blog', async () => {
    PlainAdapter.insertUpdateDelete = jest.fn()

    await Executor.execute(queries.removeBlog, {keyword: {
      blogid: 10
    }, positional: []})
    expect(PlainAdapter.insertUpdateDelete).toHaveBeenCalledTimes(1)
    expect(PlainAdapter.insertUpdateDelete).toHaveBeenCalledWith(queries.removeBlog.queryString, 10)
  })

  it('should delete two blogs', async () => {
    PlainAdapter.insertUpdateDeleteMany = jest.fn()

    await Executor.execute(queries.removeTwoBlogs, {keyword: {
      blogid1: 10,
      blogid2: 20
    }, positional: []})

    expect(PlainAdapter.insertUpdateDeleteMany).toHaveBeenCalledTimes(1)
    expect(PlainAdapter.insertUpdateDeleteMany).toHaveBeenCalledWith(
      queries.removeTwoBlogs.queryString,
      10,
      20
    )
  })

  it('should select', async () => {
    const result = await Executor.execute(queries.getUserBlogs, {
      keyword: { userid: 100 },
      positional: []
    })

    expect(result).toEqual([100])
  })

  it('should select one user', async () => {
    const result = await Executor.execute(queries.getCurrentUser, {
      keyword: { userid: 100 },
      positional: []
    })

    expect(result).toEqual(100)
  })

  it('should select one user not found', async () => {
    PlainAdapter.select = <T>() => Promise.resolve([] as unknown as T)
    const result = await Executor.execute(queries.getCurrentUser, {
      keyword: { userid: 100 },
      positional: []
    })

    expect(result).toEqual(undefined)
  })

  it('should select return undefined when many users with found', async () => {
    PlainAdapter.select = <T>() => Promise.resolve([100, 20] as unknown as T)
    const result = await Executor.execute(queries.getCurrentUser, {
      keyword: { userid: 100 },
      positional: []
    })

    expect(result).toEqual(undefined)
  })
})