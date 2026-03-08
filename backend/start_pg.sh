# 新建一个 postgres 数据库容器
docker run --name rbt-interview-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=rbt@123456 -p 5432:5432 -d postgres:latest

# 启动现有的 postgres 数据库容器
docker start rbt-interview-postgres
