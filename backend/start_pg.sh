# 新建一个 postgres 数据库容器
docker run --name irb-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=irb@123456 -e POSTGRES_DB=irb_interview -p 5432:5432 -d postgres:latest

# 启动现有的 postgres 数据库容器
docker start irb-postgres
