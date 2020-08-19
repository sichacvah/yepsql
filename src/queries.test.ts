import {
  parseString
} from './queries'

const textsql = `
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


-- name: removeBlog!
-- Remove a blog from the database
delete from blogs where blogid = :blogid;


-- name: getUserBlogs
-- Get blogs authored by a user.
  select title,
         published
    from blogs
   where userid = :userid
order by published desc;
`

describe('parseString', () => {
  
  it('should return queries', () => {
    console.log(parseString(textsql))
  })
})