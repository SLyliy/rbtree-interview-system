CREATE TABLE answers (
    id SERIAL PRIMARY KEY, -- 答案ID
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE, -- 题目ID
    content TEXT NOT NULL, -- 富文本内容
    code_example TEXT, -- 代码示例
    language_id INTEGER NOT NULL REFERENCES languages(id) ON DELETE SET NULL, -- 代码语言
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- 创建者
    is_official BOOLEAN DEFAULT FALSE, -- 是否为官方答案
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- 更新时间
);

-- 创建索引
CREATE INDEX idx_answers_question ON answers(question_id); -- 题目索引
CREATE INDEX idx_answers_creator ON answers(creator_id); -- 创建者索引