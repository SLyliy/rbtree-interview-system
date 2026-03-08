FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

# 不再复制项目中所有文件（包括.env），而是有选择地复制
COPY src ./src
COPY sqls ./sqls
# 其他必要文件可以在这里添加

# 设置默认环境变量，这些将被docker-compose中的环境变量覆盖
ENV DB_HOST=localhost \
    DB_USER=postgres \
    DB_PASSWORD=irb@123456 \
    DB_NAME=irb_interview \
    DB_PORT=5432 \
    PORT=3006 \
    JWT_SECRET=rbtree-interview-system-2025 \
    JWT_EXPIRES_IN=24h

EXPOSE 3006

CMD ["npm", "start"]
