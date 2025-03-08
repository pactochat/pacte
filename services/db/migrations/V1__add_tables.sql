CREATE TABLE users (id UUID PRIMARY KEY, email TEXT);
CREATE TABLE projects (id UUID PRIMARY KEY, user_id UUID, name TEXT, FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE files (id UUID PRIMARY KEY, project_id UUID, filename TEXT, language TEXT, library_set TEXT, FOREIGN KEY (project_id) REFERENCES projects(id));
CREATE TABLE versions (id UUID PRIMARY KEY, file_id UUID, content TEXT, timestamp BIGINT, FOREIGN KEY (file_id) REFERENCES files(id));

CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID,
  name TEXT,
  is_permanent BOOLEAN,
  gitea_repo_url TEXT
);
CREATE TABLE files (
  id UUID PRIMARY KEY,
  project_id UUID,
  filename TEXT,
  language TEXT
);
