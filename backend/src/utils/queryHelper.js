// utils/queryHelper.js
const db = require('../db'); // 你的 pg 客户端

/**
 * 通用分页查询函数
 * @param {string} tableName - 表名
 * @param {object} options - 查询选项
 * @param {object} options.where - 查询条件 { columnName: value, ... }
 * @param {string} options.orderBy - 排序字段
 * @param {string} options.orderDir - 排序方向 ('ASC' or 'DESC')
 * @param {string[]} options.fields - 要选择的字段
 * @param {number} options.current - 当前页码
 * @param {number} options.pageSize - 每页记录数
 * @returns {Promise<{list: any[], total: number}>} 查询结果
 */
async function paginatedQuery(tableName, options = {}) {
  const {
    where = {},
    orderBy = 'id',
    orderDir = 'DESC',
    fields = ['*'],
    current = 1,
    pageSize = 10
  } = options;
  
  // 构建 WHERE 子句
  const whereEntries = Object.entries(where).filter(([_, value]) => value !== undefined && value !== null);
  
  let whereClause = '';
  const params = [];
  
  if (whereEntries.length > 0) {
    whereClause = ' WHERE ' + whereEntries.map(([column, value], index) => {
      params.push(value instanceof Array ? value : 
                 typeof value === 'string' && value.includes('%') ? value : value);
      
      if (value instanceof Array) {
        return `${column} = ANY($${params.length})`;
      } else if (typeof value === 'string' && value.includes('%')) {
        return `${column} ILIKE $${params.length}`;
      } else {
        return `${column} = $${params.length}`;
      }
    }).join(' AND ');
  }
  
  // 计算分页参数
  const offset = (current - 1) * pageSize;
  
  // 查询总数
  const countQuery = `SELECT COUNT(*) FROM ${tableName}${whereClause}`;
  const countResult = await db.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count, 10);
  
  // 查询分页数据
  const dataParams = [...params];
  dataParams.push(pageSize);
  dataParams.push(offset);
  
  const fieldSelection = fields.join(', ');
  const dataQuery = `
    SELECT ${fieldSelection} FROM ${tableName}${whereClause}
    ORDER BY ${orderBy} ${orderDir}
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;
  
  const dataResult = await db.query(dataQuery, dataParams);
  
  return {
    list: dataResult.rows,
    total
  };
}

/**
 * 响应格式化函数
 */
function formatResponse(list, total, current, pageSize) {
  return {
    code: 200,
    data: {
      list,
      pagination: {
        current,
        pageSize,
        total
      }
    }
  };
}

module.exports = {
  paginatedQuery,
  formatResponse
};