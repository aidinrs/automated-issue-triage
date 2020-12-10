CREATE TABLE developers(
  id integer,
  login TEXT,
  html_url TEXT,
  type TEXT,
  PRIMARY KEY (id)
); 

CREATE TABLE repositories (
  full_name TEXT,
  id integer PRIMARY KEY,
  distinct_releases integer,
  releases_mean_time integer,
  releases_median_time integer,
  first_release_date TEXT,
  last_release_date TEXT,
  total_time_days integer,
  contributors integer,
  size integer,
  watchers_count integer,
  stargazers_count integer,
  description TEXT,
  url TEXT,
  name TEXT,
  language TEXT,
  forks_count integer,
  open_issues_count integer,
  created_at timestamp ,
  pushed_at timestamp ,
  owner_id integer,
  FOREIGN KEY (owner_id) REFERENCES developers(id)
); 

CREATE TABLE issues(
  id integer PRIMARY KEY,
  body TEXT,
  closed_at timestamp,
  comments integer,
  created_at timestamp,
  labels TEXT,
  milestone TEXT,
  number integer,
  state TEXT,
  title TEXT,
  url TEXT,
  repo_id integer,
  user_id integer,
  cleaned_labels text,
  not_question boolean,
  question boolean,
  text_body text,
  cleaned_text_body text,
  tokens text,
  sentence_count integer,
  tokens_count integer,
  FOREIGN KEY (repo_id) REFERENCES repositories(id),
  FOREIGN KEY (user_id) REFERENCES developers(id)
); 

CREATE TABLE words(
  word TEXT PRIMARY KEY,
  vector TEXT
); 
