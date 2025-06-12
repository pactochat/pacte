# Sync Rules

Source: <https://docs.powersync.com/usage/sync-rules>

PowerSync Sync Rules allow developers to control which data gets synchronized to which devices (i.e. they enable *dynamic partial replication*).

## Introduction

We recommend starting with our [Sync Rules from First Principles](https://www.powersync.com/blog/sync-rules-from-first-principles-partial-replication-to-sqlite) blog post, which explains on a high-level what Sync Rules are, why they exist and how to implement them.

The remainder of these docs dive further into the details.

## Defining Sync Rules

Each [PowerSync Service](/architecture/powersync-service) instance has a Sync Rules configuration where Sync Rules are defined using SQL-like queries (limitations and more info [here](/usage/sync-rules/operators-and-functions)) combined together in a YAML file.

This SQL-like syntax is used when connecting to either Postgres, MongoDB or MySQL as the backend source database.

The [PowerSync Service](/architecture/powersync-service) uses these SQL-like queries to group data into "sync buckets" when replicating data to client devices.

<Frame caption="Sync rules are configured per PowerSync instance.">
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage-8.webp" />
</Frame>

Functionality includes:

* Selecting tables/collections and columns/fields to sync.
* Filtering data according to user ID.
* Filter data with static conditions.
* Filter data with custom parameters (from [the JWT](/installation/authentication-setup) or [from clients directly](/usage/sync-rules/advanced-topics/client-parameters))
* Transforming column/field values.

## Replication Into Sync Buckets

PowerSync replicates and transforms relevant data from the backend source database according to Sync Rules.

Data from this step is persisted in separate sync buckets on the PowerSync Service. Data is incrementally updated so that sync buckets always contain current state data as well as a full history of changes.

<Frame caption="Diagram showing how data is replicated from the source database into sync buckets.">
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage-9.webp" />
</Frame>

## Client Database Hydration

PowerSync asynchronously hydrates local SQLite databases embedded in the PowerSync Client SDK based on data in sync buckets.

<Frame caption="Data flow showing sync buckets which are created based on sync rules.">
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage-10.webp" />
</Frame>

# Advanced Topics

Source: <https://docs.powersync.com/usage/sync-rules/advanced-topics>

Advanced topics relating to Sync Rules.

<CardGroup>
  <Card title="Multiple Client Versions" icon="code-branch" href="/usage/sync-rules/advanced-topics/multiple-client-versions" horizontal />

  <Card title="Client Parameters" icon="sliders" href="/usage/sync-rules/advanced-topics/client-parameters" horizontal />

  <Card title="Partitioned Tables (Postgres)" icon="table" href="/usage/sync-rules/advanced-topics/partitioned-tables" horizontal />

  <Card title="Sharded Databases" icon="database" href="/usage/sync-rules/advanced-topics/sharded-databases" horizontal />
</CardGroup>

# Client Parameters

Source: <https://docs.powersync.com/usage/sync-rules/advanced-topics/client-parameters>

Pass parameters from the client directly for use in Sync Rules.

<Warning>
  Use client parameters with caution. Please make sure to read the [Security consideration](#security-consideration) section below.
</Warning>

Client parameters are parameters that are passed to the PowerSync Service instance from the client SDK, and can be used in Sync Rules' [parameter queries](/usage/sync-rules/parameter-queries) to further filter data.

PowerSync already supports using **token parameters** in parameter queries. An example of a token parameter is a user ID, and this is commonly used to filter synced data by the user. These parameters are embedded in the JWT [authentication token](/installation/authentication-setup/custom), and therefore can be considered trusted and can be used for access control purposes.

**Client parameters** are specified directly by the client (i.e. not through the JWT authentication token). The advantage of client parameters is that they give client-side control over what data to sync, and can therefore be used to further filter or limit synced data. A common use case is [lazy-loading](/usage/use-case-examples/infinite-scrolling#2-control-data-sync-using-client-parameters), where data is split into pages and a client parameter can be used to specify which page(s) to sync to a user, and this can update dynamically as the user paginates (or reaches the end of an infinite-scrolling feed).

### Usage

Client parameters are defined when [instantiating the PowerSync database](/installation/client-side-setup/instantiate-powersync-database), within the options of PowerSync's `connect()` method:

```js
const connector = new DemoConnector();
const powerSync = db;

function connectPowerSync() {
  powerSync.connect(connector, {
    params: { "current_page": <page> }  // Specify client parameters here
  });
}
```

The parameter is then available in [Sync Rules](/usage/sync-rules) under `request.parameters` (alongside the already supported `request.user_id`).

In this example, only 'posts' from the user's current page are synced:

```yaml
# sync-rules.yaml
bucket_definitions:
  shared_posts:
    parameters: SELECT (request.parameters() ->> 'current_page') as page_number
    data:
      - SELECT * FROM posts WHERE page_number = bucket.page_number
```

### Security consideration

An important consideration with client parameters is that a client can pass any value, and sync data accordingly. Hence, client parameters should always be treated with care, and should not be used for access control purposes. Where permissions are required, use token parameters (`request.jwt()`) instead, or use token parameters in combination with client parameters.

The following examples show **secure** vs. **insecure** ways of using client and token parameters:

#### Secure (using a token parameter only)

```yaml
# sync-rules.yaml
bucket_definitions:
  selected_projects:
    # Sync projects based on org_id from the JWT
    # Since these parameters are embedded in the JWT (authentication token)
    # they can be considered trusted
    parameters: SELECT id as project_id FROM projects WHERE org_id IN request.jwt() ->> 'app_metadata.org_id'
    data:
      - ...
```

#### Insecure (using a client parameter only)

```yaml
# sync-rules.yaml
bucket_definitions:
  selected_projects:
    # Do NOT do this: Sync projects based on a client parameter
    # request.parameters() are specified by the client directly
    # Because the client can send any value for these parameters
    # it's not a good place to do authorization
    parameters: SELECT id as project_id FROM projects WHERE id in request.parameters() ->> 'selected_projects'
    data:
      - ...
```

#### Secure (using a token parameter combined with a client parameter)

```yaml
# sync-rules.yaml
bucket_definitions:
  selected_projects:
    # Sync projects based on org_id from the JWT, and additionally sync archived projects
    # only when specifically requested by the client
    # The JWT is a Supabase specific example with a
    # custom field set in app_metadata
    parameters: SELECT id as project_id FROM projects WHERE org_id IN request.jwt() ->> 'app_metadata.org_id' AND archived = true AND request.parameters() ->> 'include_archived'
    data:
      - ...
```

### Warning on potentially dangerous queries

Based on the above security consideration, the [PowerSync Dashboard](/usage/tools/powersync-dashboard) will warn developers when client parameters are being used in sync rules in an insecure way (i.e. where the query does not also include a parameter from `request.jwt()`).

The below sync rules will display the warning:

> Potentially dangerous query based on parameters set by the client. The client can send any value for these parameters so it's not a good place to do authorization.

```yaml
# sync-rules.yaml
bucket_definitions:
  selected_projects:
    parameters: SELECT request.parameters() ->> 'project_id' as project_id
    data:
      - ...
```

This warning can be disabled by specifying `accept_potentially_dangerous_queries: true` in the bucket definition:

```yaml
# sync-rules.yaml
bucket_definitions:
  selected_projects:
    accept_potentially_dangerous_queries: true
    parameters: SELECT request.parameters() ->> 'project_id' as project_id
    data:
      - ...
```

# Multiple Client Versions

Source: <https://docs.powersync.com/usage/sync-rules/advanced-topics/multiple-client-versions>

In some cases, different client versions may need different output schemas.

When schema changes are additive, old clients would just ignore the new tables and columns, and no special handling is required. However, in some cases, the schema changes may be more drastic and may need separate Sync Rules based on the client version.

To distinguish between client versions, we can pass in an additional[client parameter](/usage/sync-rules/advanced-topics/client-parameters) from the client to the PowerSync Service instance. These parameters could be used to implement different logic based on the client version.

Example to use different table names based on the client's `schema_version`:

```yaml
# Client passes in: "params": {"schema_version": <version>}
  assets_v1:
    parameters: SELECT request.user_id() AS user_id
      WHERE request.parameters() ->> 'schema_version' = '1'
    data:
      - SELECT * FROM assets AS assets_v1 WHERE user_id = bucket.user_id

  assets_v2:
    parameters: SELECT request.user_id() AS user_id
      WHERE request.parameters() ->> 'schema_version' = '2'
    data:
      - SELECT * FROM assets AS assets_v2 WHERE user_id = bucket.user_id
```

<Warning>
  Handle queries based on parameters set by the client with care. The client can send any value for these parameters, so it's not a good place to do authorization. If the parameter must be authenticated, use parameters from the JWT instead. Read more: [Security consideration](/usage/sync-rules/advanced-topics/client-parameters#security-consideration)
</Warning>

# Partitioned Tables (Postgres)

Source: <https://docs.powersync.com/usage/sync-rules/advanced-topics/partitioned-tables>

Partitioned tables and wildcard table name matching

For partitioned tables in Postgres, each individual partition is replicated and processed using Sync Rules.

To use the same queries and same output table name for each partition, use `%` for wildcard suffix matching of the table name:

```yaml
  by_user:
    # Use wildcard in a parameter query
    parameters: SELECT id AS user_id FROM "users_%"
    data:
      # Use wildcard in a data query
      - SELECT * FROM "todos_%" AS todos WHERE user_id = bucket.user_id
```

The wildcard character can only be used as the last character in the table name.

When using wildcard table names, the original table suffix is available in the special `_table_suffix` column:

```sql
SELECT * FROM "todos_%" AS todos WHERE _table_suffix != 'archived'
```

When no table alias is provided, the original table name is preserved.

`publish_via_partition_root` on the publication is not supported — the individual partitions must be published.

# Sharded Databases

Source: <https://docs.powersync.com/usage/sync-rules/advanced-topics/sharded-databases>

Sharding is often used in backend databases to handle higher data volumes.

In the case of Postgres, PowerSync cannot replicate Postgres [foreign tables](https://www.postgresql.org/docs/current/ddl-foreign-data.html).

However, PowerSync does have options available to support sharded databases in general.

<Info>
  When using MongoDB or MySQL as the backend source database, PowerSync does not currently support connecting to sharded clusters.
</Info>

The primary options are:

1. Use a separate PowerSync Service instance per database.
2. Add a connection for each database in the same PowerSync Service instance ([planned](https://roadmap.powersync.com/c/84-support-for-sharding-multiple-database-connections); this capability will be available in a future release).

Where feasible, using separate PowerSync Service instances would give better performance and give more control over how changes are rolled out, especially around Sync Rule reprocessing.

Some specific scenarios:

#### 1. Different tables on different databases

This is common when separate "services" use separate databases, but multiple tables across those databases need to be synchronized to the same users.

Use a single PowerSync Service instance, with a separate connection for each source database ([planned](https://roadmap.powersync.com/c/84-support-for-sharding-multiple-database-connections); this capability will be available in a future release). Use a unique [connection tag](/usage/sync-rules/schemas-and-connections) for each source database, allowing them to be distinguished in the Sync Rules.

#### 2a. All data for any single customer is contained in a single shard

This is common when sharding per customer account / organization.

In this case, use a separate PowerSync Service instance for each database.

#### 2b. Most customer data is in a single shard, but some data is in a shared database

If the amount of shared data is small, still use a separate PowerSync Service instance for each database, but also add the shared database connection to each PowerSync Service instance using a separate connection tag ([planned](https://roadmap.powersync.com/c/84-support-for-sharding-multiple-database-connections); this capability will be available in a future release).

#### 3. Only some tables are sharded

In some cases, most tables would be on a shared server, with only a few large tables being sharded.

For this case, use a single PowerSync Service instance. Add each shard as a new connection on this instance ([planned](https://roadmap.powersync.com/c/84-support-for-sharding-multiple-database-connections); this capability will be available in a future release) — all with the same connection tag, so that the same Sync Rules apply to each.

# Case Sensitivity

Source: <https://docs.powersync.com/usage/sync-rules/case-sensitivity>

For simplicity, we recommend using only lower case identifiers for all table/collection and column/field names used in PowerSync. If you need to use a different case, continue reading.

### Case in Sync Rules

PowerSync converts all table/collection and column/field names to lower-case by default in Sync Rule queries (this is how Postgres also behaves). To preserve the case, surround the names with double quotes, for example:

```sql
SELECT "ID" as id, "Description", "ListID" FROM "TODOs" WHERE "TODOs"."ListID" = bucket.list_id
```

When using `SELECT *`, the original case is preserved for the returned columns/fields.

### Client-Side Case

On the client side, the case of table and column names in the [client-side schema](/installation/client-side-setup/define-your-schema) must match the case produced by Sync Rules exactly. For the above example, use the following in Dart:

```dart
  Table('TODOs', [
    Column.text('Description'),
    Column.text('ListID')
  ])
```

SQLite itself is case-insensitive. When querying and modifying the data on the client, any case may be used. For example, the above table may be queried using `SELECT description FROM todos WHERE listid = ?`.

Operations (`PUT`/`PATCH`/`DELETE`) are stored in the upload queue using the case as defined in the schema above for table and column names, not the case used in queries.

As another example, in this Sync Rule query:

```sql
SELECT ID, todo_description as Description FROM todo_items as TODOs
```

Each identifier in the example is unquoted and converted to lower case. That means the client-side schema would be:

```dart
Table('todos', [
  Column.text('description')
])
```

# Client ID

Source: <https://docs.powersync.com/usage/sync-rules/client-id>

On the client, PowerSync only supports a single primary key column called `id`, of type `text`.

For tables where the client will create new rows, we recommend using a UUID for the ID. We provide a helper function `uuid()` to generate a random UUID (v4) on the client.

To use a different column/field from the server-side database as the record ID on the client, use a column/field alias in your Sync Rules:

```sql
SELECT client_id as id FROM my_data
```

<Info>
  MongoDB uses `_id` as the name of the ID field in collections. Therefore, PowerSync requires using `SELECT _id as id` in the data queries when [using MongoDB](/installation/database-setup) as the backend source database.
</Info>

Custom transformations could also be used for the ID, for example:

```sql
-- Concatenate multiple columns into a single id column
SELECT org_id || '.' || record_id as id FROM my_data
```

PowerSync does not perform any validation that IDs are unique. Duplicate IDs on a client could occur in any of these scenarios:

1. A non-unique column is used for the ID.
2. Multiple table partitions are used (Postgres), with the same ID present in different partitions.
3. Multiple data queries returning the same record. This is typically not an issue if the queries return the same values (same transformations used in each query).

We recommend using a unique index on the fields in the source database to ensure uniqueness — this will prevent (1) at least.

If the client does sync multiple records with the same ID, only one will be present in the final database. This would typically be the one modified last, but this is subject to change — do not depend on any specific record being picked.

### <Icon icon="elephant" iconType="solid" size="24" /> Postgres: Strategies for Auto-Incrementing IDs

With auto-incrementing / sequential IDs (e.g. `sequence` type in Postgres), the issue is that the ID can only be generated on the server, and not on the client while offline. If this *must* be used, there are some options, depending on the use case.

#### Option 1: Generate ID when server receives record

If the client does not use the ID as a reference (foreign key) elsewhere, insert any unique value on the client in the `id` field, then generate a new ID when the server receives it.

#### Option 2: Pre-create records on the server

For some use cases, it could work to have the server pre-create a set of e.g. 100 draft records for each user. While offline, the client can populate these records without needing to generate new IDs. This is similar to providing an employee with a paper book of blank invoices — each with an invoice number pre-printed.

This does mean that a user has a limit on how many records can be populated while offline.

Care must be taken if a user can populate the same records from different devices while offline — ideally each device must have a unique set of pre-created records.

#### Option 3: Use an ID mapping

Use UUIDs on the client, then map them to sequential IDs when performing an update on the server. This allows using a sequential primary key for each record, with a UUID as a secondary ID.

This mapping must be performed wherever the UUIDs are referenced, including for every foreign key column.

For more information, have a look at the [Sequential ID Mapping tutorial](/tutorials/client/data/sequential-id-mapping).

# Data Queries

Source: <https://docs.powersync.com/usage/sync-rules/data-queries>

Data queries select the data that form part of a bucket, using the bucket parameters.

Multiple data queries can be specified for a single bucket definition.

<Info>
  **Data queries are used to group data into buckets, so each data query must use every bucket parameter.**
</Info>

## Examples

#### Grouping by list\_id

```yaml
bucket_definitions:
  owned_lists:
    parameters: |
        SELECT id as list_id FROM lists WHERE
           owner_id = request.user_id()
    data:
      - SELECT * FROM lists WHERE lists.id = bucket.list_id
      - SELECT * FROM todos WHERE todos.list_id = bucket.list_id
```

#### Selecting output columns/fields

When specific columns/fields are selected, only those columns/fields are synced to the client.

This is good practice, to ensure the synced data does not unintentionally change when new columns are added to the schema (in the case of Postgres) or to the data structure (in the case of MongoDB).

Note: An `id` column must always be present, and must have a `text` type. If the primary key is different, use a column alias and/or transformations to output a `text` id column.

```yaml
bucket_definitions:
  global:
    data:
      - SELECT id, name, owner_id FROM lists
```

<Info>
  MongoDB uses `_id` as the name of the ID field in collections. Therefore, PowerSync requires using `SELECT _id as id` in the data queries when [using MongoDB](/installation/database-setup) as the backend source database.
</Info>

#### Renaming columns/fields

Different names (aliases) may be specified for columns/fields:

```yaml
bucket_definitions:
  global:
    data:
      - SELECT id, name, created_timestamp AS created_at FROM lists
```

#### Transforming columns/fields

A limited set of operators and functions are available to transform the output value of columns/fields.

```yaml
bucket_definitions:
  global:
    data:
      # Cast number to text
      - SELECT id, item_number :: text AS item_number FROM todos
      # Alternative syntax for the same cast
      - SELECT id, CAST(item_number as TEXT) AS item_number FROM todos
      # Convert binary data (bytea) to base64
      - SELECT id, base64(thumbnail) AS thumbnail_base64 FROM todos
      # Extract field from JSON or JSONB column
      - SELECT id, metadata_json ->> 'description' AS description FROM todos
      # Convert time to epoch number
      - SELECT id, unixepoch(created_at) AS created_at FROM todos
```

# Global Data

Source: <https://docs.powersync.com/usage/sync-rules/example-global-data>

The simplest Sync Rules are for "global" data — synced to all users.

For example, the following Sync Rules sync all `todos` and only unarchived `lists` to all users:

```yaml
bucket_definitions:
  global_bucket:
    data:
      # Sync all todos
      - SELECT * FROM todos
      # Sync all lists except archived ones
      - SELECT * FROM lists WHERE archived = false
```

<Info>
  **Note**: Table names within Sync Rules must match the names defined in the [client-side schema](/installation/client-side-setup/define-your-schema).
</Info>

# Glossary

Source: <https://docs.powersync.com/usage/sync-rules/glossary>

A group of rows/documents, from one or more tables/collections.

### Bucket / Bucket instance

Each bucket can be synced by any number of users, as a whole. The [PowerSync protocol](/architecture/powersync-protocol) does not support syncing partial buckets (filtering inside buckets).

Each bucket is defined by its bucket definition name and set of parameter values. Together this forms its ID, for example `by_user["user1","admin"]`.

### Bucket Definition

This is the “[Sync Rule](/usage/sync-rules)” that describes buckets. Specifies the name, parameter query(ies), and data queries.

Each bucket definition describes a set of buckets using SQL-like queries.

### Bucket Parameters

This is the set of parameters that uniquely identifies an individual bucket within a bucket definition. Together with the bucket name, this forms the bucket ID.

The bucket parameters are defined using one or more SQL-like queries in a bucket definition. These queries can return values directly from the user's authentication token (token parameters), and/or select values from a table/collection.

### Token Parameters

This is a set of parameters specified in the user's [authentication token](/installation/authentication-setup) (JWT). This always includes the token subject (the `user_id`), but may include additional and custom parameters.

Token parameters are used to identify the user, and specify permissions for the user.

These parameters are signed as part of the JWT generated [on your app backend](/installation/client-side-setup/integrating-with-your-backend).

### Client Parameters

In addition to token parameters, the client may add parameters to the sync request.

A client can pass any value, and sync data accordingly. Hence, client parameters should always be treated with care, and should not be used for access control purposes.

However, client parameters can be used to filter data for use cases such as:

1. Syncing different buckets based on the client version ([example](/usage/sync-rules/advanced-topics/multiple-client-versions)).
2. Syncing different buckets based on state in the client app, for example only synchronizing data for the customer currently selected.

Learn more here: [Client Parameters (Beta)](/usage/sync-rules/advanced-topics/client-parameters)

### Global Buckets

Global buckets are buckets with no parameters.

If no parameter query is specified, the bucket is automatically a global bucket.

Parameter queries may still be used to filter buckets for an user, as long as it does not contain any output columns/fields.

# Guide: Many-to-Many and Join Tables

Source: <https://docs.powersync.com/usage/sync-rules/guide-many-to-many-and-join-tables>

Join tables are often used to implement many-to-many relationships between tables. Join queries are not directly supported in PowerSync Sync Rules, and require some workarounds depending on the use case. This guide contains some recommended strategies.

## Example

As an example, consider a social media application. The app has message boards. Each user can subscribe to boards, make posts, and comment on posts. Posts may also have one or more topics.

<Frame>
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage-11.avif" />
</Frame>

<Accordion title="Full schema (for Postgres)">
  ```sql
  create table users (
      id uuid not null default gen_random_uuid (),
      name text not null,
      last_activity timestamp with time zone,
      constraint users_pkey primary key (id)
  );

  create table boards (
      id uuid not null default gen_random_uuid (),
      name text not null,
      constraint boards_pkey primary key (id)
    );

  create table posts (
      id uuid not null default gen_random_uuid (),
      board_id uuid not null,
      created_at timestamp with time zone not null default now(),
      author_id uuid not null,
      title text not null,
      body text not null,
      constraint posts_pkey primary key (id),
      constraint posts_author_id_fkey foreign key (author_id) references users (id),
      constraint posts_board_id_fkey foreign key (board_id) references boards (id)
    );

  create table comments (
      id uuid not null default gen_random_uuid (),
      post_id uuid not null,
      created_at timestamp with time zone not null default now(),
      author_id uuid not null,
      body text not null,
      constraint comments_pkey primary key (id),
      constraint comments_author_id_fkey foreign key (author_id) references users (id),
      constraint comments_post_id_fkey foreign key (post_id) references posts (id)
    );

  create table board_subscriptions (
      id uuid not null default gen_random_uuid (),
      user_id uuid not null,
      board_id uuid not null,
      constraint board_subscriptions_pkey primary key (id),
      constraint board_subscriptions_board_id_fkey foreign key (board_id) references boards (id),
      constraint board_subscriptions_user_id_fkey foreign key (user_id) references users (id)
    );

  create table topics (
      id uuid not null default gen_random_uuid (),
      label text not null
    );

  create table post_topics (
      id uuid not null default gen_random_uuid (),
      board_id uuid not null,
      post_id uuid not null,
      topic_id uuid not null,
      constraint post_topics_pkey primary key (id),
      constraint post_topics_board_id_fkey foreign key (board_id) references boards (id),
      constraint post_topics_post_id_fkey foreign key (post_id) references posts (id),
      constraint post_topics_topic_id_fkey foreign key (topic_id) references topics (id)
    );

  ```
</Accordion>

### Many-to-many: Bucket parameters

For this app, we generally want to sync all posts in boards that users have subscribed to. To simplify these examples, we assume a user has to be subscribed to a board to post.

Boards make a nice grouping of data for Sync Rules: We sync the boards that a user has subscribed to, and the same board data is synced to all users subscribed to that board.

The relationship between users and boards is a many-to-many, specified via the `board_subscriptions` table.

To start with, in our PowerSync Sync Rules, we define a [bucket](/usage/sync-rules/organize-data-into-buckets) and sync the posts. The [parameter query](/usage/sync-rules/parameter-queries) is defined using the `board_subscriptions` table:

```yaml
  board_data:
    parameters: select board_id from board_subscriptions where user_id = request.user_id()
    data:
      - select * from posts where board_id = bucket.board_id
```

### Avoiding joins in data queries: Denormalize relationships (comments)

Next, we also want to sync comments for those boards. There is a one-to-many relationship between boards and comments, via the `posts` table. This means conceptually we can add comments to the same board bucket. With general SQL, the query could be:

```sql
SELECT comments.* FROM comments
JOIN posts ON posts.id = comments.post_id
WHERE board_id = bucket.board_id
```

Unfortunately, joins are not supported in PowerSync's Sync Rules. Instead, we denormalize the data to add a direct foreign key relationship between comments and boards: (Postgres example)

```sql
ALTER TABLE comments ADD COLUMN board_id uuid;
ALTER TABLE comments ADD CONSTRAINT comments_board_id_fkey FOREIGN KEY (board_id) REFERENCES boards (id);
```

Now we can add it to the bucket definition in our Sync Rules:

```yaml
  board_data:
    parameters: select board_id from board_subscriptions where user_id = request.user_id()
    data:
      - select * from posts where board_id = bucket.board_id
      # Add comments:
      - select * from comments where board_id = bucket.board_id
```

Now we want to sync topics of posts. In this case we added `board_id` from the start, so `post_topics` is simple in our Sync Rules:

```yaml
  board_data:
    parameters: select board_id from board_subscriptions where user_id = request.user_id()
    data:
      - select * from posts where board_id = bucket.board_id
      - select * from comments where board_id = bucket.board_id
      # Add post_topics:
      - select * from post_topics where board_id = bucket.board_id
```

### Many-to-many strategy: Sync everything (topics)

Now we need access to sync the topics for all posts synced to the device. There is a many-to-many relationship between posts and topics, and by extension boards to topics. This means there is no simple direct way to partition topics into buckets — the same topics be used on any number of boards.

If the topics table is limited in size (say 1,000 or less), the simplest solution is to just sync all topics in our Sync Rules:

```yaml
  global_topics:
    data:
      - select * from topics where board_id = bucket.board_id
```

### Many-to-many strategy: Denormalize data (topics, user names)

If there are many thousands of topics, we may want to avoid syncing everything. One option is to denormalize the data by copying the topic label over to `post_topics`: (Postgres example)

```sql
ALTER TABLE post_topics ADD COLUMN topic_label text not null;
```

Now we don't need to sync the `topics` table itself, as everything is included in `post_topics`. Assuming the topic label never or rarely changes, this could be a good solution.

Next up, we want to sync the relevant user profiles, so we can show it together with comments and posts. For simplicity, we sync profiles for all users subscribed to a board.

One option is to add the author name to each board subscription, similar to what we've done for `topics`: (Postgres example)

```sql
ALTER TABLE board_subscriptions ADD COLUMN user_name text;
```

Sync Rules:

```yaml
  board_data:
    parameters: select board_id from board_subscriptions where user_id = request.user_id()
    data:
      - select * from posts where board_id = bucket.board_id
      - select * from comments where board_id = bucket.board_id
      - select * from post_topics where board_id = bucket.board_id
      # Add subscriptions which include the names:
      - select * from board_subscriptions where board_id = bucket.board_id
```

### Many-to-many strategy: Array of IDs (user profiles)

If we need to sync more than just the name (let's say we need a last activity date, profile picture and bio text as well), the above approach doesn't scale as well. Instead, we want to sync the `users` table directly. To sync user profiles directly in the bucket for the board, we need a new array.

Adding an array to the schema in Postgres:

```sql
ALTER TABLE users ADD COLUMN subscribed_board_ids uuid[];
```

By using an array instead of or in addition to a join table, we can use it directly in Sync Rules:

```yaml
board_data:
  parameters: select board_id from board_subscriptions where user_id = request.user_id()
  data:
    - select * from posts where board_id = bucket.board_id
    - select * from comments where board_id = bucket.board_id
    - select * from post_topics where board_id = bucket.board_id
    # Add participating users:
    - select name, last_activity, profile_picture, bio from users where bucket.board_id in subscribed_board_ids
```

This approach does require some extra effort to keep the array up to date. One option is to use a trigger in the case of Postgres:

<Accordion title="Postgres trigger to update subscribed_board_ids">
  ```sql
  CREATE OR REPLACE FUNCTION recalculate_subscribed_boards()
  RETURNS TRIGGER AS $$
  BEGIN
      -- Recalculate subscribed_board_ids for the affected user
      UPDATE users
      SET subscribed_board_ids = (
          SELECT array_agg(board_id)
          FROM board_subscriptions
          WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      )
      WHERE id = COALESCE(NEW.user_id, OLD.user_id);

      RETURN NULL;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_board_subscriptions_change
  AFTER INSERT OR UPDATE OR DELETE ON board_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_subscribed_boards();
  ```
</Accordion>

Note that this approach does have scaling limitations. When the number of board subscriptions per user becomes large (say over 100 rows per user), then:

1. Updating the `subscribed_board_ids` array in Postgres becomes slower.
2. The overhead is even more pronounced on PowerSync, since PowerSync maintains a separate copy of the data in each bucket.

In those cases, another approach may be more suitable.

# Operators and Functions
Source: https://docs.powersync.com/usage/sync-rules/operators-and-functions

Operators and functions can be used to transform columns/fields before being synced to a client.

When filtering on parameters (token or [client parameters](/usage/sync-rules/advanced-topics/client-parameters) in the case of [parameter queries](/usage/sync-rules/parameter-queries), and bucket parameters in the case of [data queries](/usage/sync-rules/data-queries)), operators can only be used in a limited way. Typically only `=` , `IN` and `IS NULL` are allowed on the parameters, and special limits apply when combining clauses with `AND`, `OR` or `NOT`.

When transforming output columns/fields, or filtering on row/document values, those restrictions do not apply.

If a specific operator or function is needed, please [contact us](/resources/contact-us) so that we can consider inclusion in our roadmap.

Some fundamental restrictions on these operators and functions are:

1. It must be deterministic — no random or time-based functions.
2. No external state can be used.
3. It must operate on data available within a single row/document. For example, no aggregation functions allowed.

### Operators

| Operator                                            | Notes                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comparison:<br /> `= != < > <= >=`                  | If either parameter is null, this evaluates to null.                                                                                                                                                                                                                                                              |
| Null:<br /> `IS NULL`, `IS NOT NULL`                |                                                                                                                                                                                                                                                                                                                   |
| Mathematical:<br /> `+ - * /`                       |                                                                                                                                                                                                                                                                                                                   |
| Logical:<br /> `AND`, `OR`, `NOT`                   |                                                                                                                                                                                                                                                                                                                   |
| Cast:<br /> `CAST(x AS type)`<br />`x :: type`      | Cast to text, numeric, integer, real or blob.                                                                                                                                                                                                                                                                     |
| JSON:<br /> `json -> 'path'`<br />`json ->> 'path'` | `->` Returns the value as a JSON string.<br /> `->>` Returns the extracted value.                                                                                                                                                                                                                                 |
| Text concatenation:<br /> `\|\|`                    | Joins two text values together.                                                                                                                                                                                                                                                                                   |
| Arrays:<br /> `<left> IN <right>`                   | Returns true if the `left` value is present in the `right` JSON array.<br />In data queries, only the `left` value may be a bucket parameter. In parameter queries, the `left` or `right` value may be a bucket parameter.<br />Differs from the SQLite operator in that it can be used directly on a JSON array. |

### Functions

| Function                                                                       | Description                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [upper(text)](https://www.sqlite.org/lang_corefunc.html#upper)                 | Convert text to upper case.                                                                                                                                                                                                                                                                                                                                                                      |
| [lower(text)](https://www.sqlite.org/lang_corefunc.html#lower)                 | Convert text to lower case.                                                                                                                                                                                                                                                                                                                                                                      |
| [substring(text, start, length)](https://sqlite.org/lang_corefunc.html#substr) | Extracts a portion of a string based on specified start index and length. Start index is 1-based. Example: `substring(created_at, 1, 10)` returns the date portion of the timestamp.                                                                                                                                                                                                             |
| [hex(data)](https://www.sqlite.org/lang_corefunc.html#hex)                     | Convert blob or text data to hexadecimal text.                                                                                                                                                                                                                                                                                                                                                   |
| base64(data)                                                                   | Convert blob or text data to base64 text.                                                                                                                                                                                                                                                                                                                                                        |
| [length(data)](https://www.sqlite.org/lang_corefunc.html#length)               | For text, return the number of characters. For blob, return the number of bytes. For null, return null. For integer and real, convert to text and return the number of characters.                                                                                                                                                                                                               |
| [typeof(data)](https://www.sqlite.org/lang_corefunc.html#typeof)               | text, integer, real, blob or null                                                                                                                                                                                                                                                                                                                                                                |
| [json\_each(data)](https://www.sqlite.org/json1.html#jeach)                    | Expands a JSON array or object from a request or token parameter into a set of parameter rows. Example: `SELECT value as project_id FROM json_each(request.jwt() -> 'project_ids'`                                                                                                                                                                                                               |
| [json\_extract(data, path)](https://www.sqlite.org/json1.html#jex)             | Same as `->>` operator, but the path must start with `$.`                                                                                                                                                                                                                                                                                                                                        |
| [json\_array\_length(data)](https://www.sqlite.org/json1.html#jarraylen)       | Given a JSON array (as text), returns the length of the array. If data is null, returns null. If the value is not a JSON array, returns 0.                                                                                                                                                                                                                                                       |
| [json\_valid(data)](https://www.sqlite.org/json1.html#jvalid)                  | Returns 1 if the data can be parsed as JSON, 0 otherwise.                                                                                                                                                                                                                                                                                                                                        |
| json\_keys(data)                                                               | Returns the set of keys of a JSON object as a JSON array. Example: `select * from items where bucket.user_id in json_keys(permissions_json)`                                                                                                                                                                                                                                                     |
| [ifnull(x,y)](https://www.sqlite.org/lang_corefunc.html#ifnull)                | Returns x if non-null, otherwise returns y.                                                                                                                                                                                                                                                                                                                                                      |
| [iif(x,y,z)](https://www.sqlite.org/lang_corefunc.html#iif)                    | Returns y if x is true, otherwise returns z.                                                                                                                                                                                                                                                                                                                                                     |
| [uuid\_blob(id)](https://sqlite.org/src/file/ext/misc/uuid.c)                  | Convert a UUID string to bytes.                                                                                                                                                                                                                                                                                                                                                                  |
| [unixepoch(datetime, \[modifier\])](https://www.sqlite.org/lang_datefunc.html) | Returns a datetime as Unix timestamp. If modifier is "subsec", the result is a floating point number, with milliseconds including in the fraction. The datetime argument is required - this function cannot be used to get the current time.                                                                                                                                                     |
| [datetime(datetime, \[modifier\])](https://www.sqlite.org/lang_datefunc.html)  | Returns a datetime as a datetime string, in the format YYYY-MM-DD HH:MM:SS. If the specifier is "subsec", milliseconds are also included. If the modifier is "unixepoch", the argument is interpreted as a unix timestamp. Both modifiers can be included: datetime(timestamp, 'unixepoch', 'subsec'). The datetime argument is required - this function cannot be used to get the current time. |
| [ST\_AsGeoJSON(geometry)](https://postgis.net/docs/ST_AsGeoJSON.html)          | Convert [PostGIS](https://postgis.net/) (in Postgres) geometry from WKB to GeoJSON. Combine with JSON operators to extract specific fields.                                                                                                                                                                                                                                                      |
| [ST\_AsText(geometry)](https://postgis.net/docs/ST_AsText.html)                | Convert [PostGIS](https://postgis.net/) (in Postgres) geometry from WKB to Well-Known Text (WKT).                                                                                                                                                                                                                                                                                                |
| [ST\_X(point)](https://postgis.net/docs/ST_X.html)                             | Get the X coordinate of a [PostGIS](https://postgis.net/) point (in Postgres)                                                                                                                                                                                                                                                                                                                    |
| [ST\_Y(point)](https://postgis.net/docs/ST_Y.html)                             | Get the Y coordinate of a [PostGIS](https://postgis.net/) point (in Postgres)                                                                                                                                                                                                                                                                                                                    |

Most of these functions are based on the [built-in SQLite functions](https://www.sqlite.org/lang_corefunc.html) and [SQLite JSON functions](https://www.sqlite.org/json1.html).

# Organize Data Into Buckets
Source: https://docs.powersync.com/usage/sync-rules/organize-data-into-buckets

To sync different sets of data to each user, data is organized into buckets.

Each user can sync a number of buckets (up to 1,000), and each bucket defines a set of tables/collections and rows/documents to sync.

This is defined using two queries:

1. Select bucket parameters from a user ID and/or other parameters ([parameter queries](/usage/sync-rules/parameter-queries))

2. Select data in the bucket using the bucket parameters ([data queries](/usage/sync-rules/data-queries))

When designing your buckets, it is recommended, but not required, to group all data in a bucket where the same parameters apply.

An example:

```yaml
bucket_definitions:
  user_lists:
    # Select parameters for the bucket, using the current user_id
    # (request.user_id() comes from the JWT token)
    parameters: SELECT request.user_id() as user_id
    data:
      # Select data rows/documents using the parameters above
      - SELECT * FROM lists WHERE owner_id = bucket.user_id
```

<Info>
  **Note**: Table names within Sync Rules must match the names defined in the [client-side schema](/installation/client-side-setup/define-your-schema).
</Info>

# Parameter Queries
Source: https://docs.powersync.com/usage/sync-rules/parameter-queries

Parameter queries allow parameters to be defined on a bucket to group data. These queries can use parameters from the JWT (we loosely refer to these as token parameters), such as a `user_id`, or [parameters from clients](/usage/sync-rules/advanced-topics/client-parameters) directly.

```yaml
bucket_definitions:
  # Bucket Name
  user_lists:
    # Parameter Query
    parameters: SELECT request.user_id() as user_id
    # Data Query
    data:
      - SELECT * FROM lists WHERE lists.owner_id = bucket.user_id

  user_lists_table:
    # Similar query, but using a table
    # Access can instantly be revoked by deleting the user row/document
    parameters: SELECT id as user_id FROM users WHERE users.id = request.user_id()
    data:
      - SELECT * FROM lists WHERE lists.user_id = bucket.user_id
```

Available functions in sync rules are:

1. `request.user_id()`: Returns the JWT subject, same as `request.jwt() ->> 'sub'`

2. `request.jwt()`: Returns the entire (signed) JWT payload as a JSON string.

3. `request.parameters()`: Returns [client parameters](/usage/sync-rules/advanced-topics/client-parameters) as a JSON string.

Example usage:

```sql
request.user_id()
request.jwt() ->> 'sub' -- Same as `request.user_id()
request.parameters() ->> 'param' -- Client parameters

-- Some Supabase-specific examples below. These can be used with standard Supabase tokens,
-- for use cases which previously required custom tokens
request.jwt() ->> 'role' -- 'authenticated' or 'anonymous'
request.jwt() ->> 'email' -- automatic email field
request.jwt() ->> 'app_metadata.custom_field' -- custom field added by a service account (authenticated)

```

<Note>
  A previous syntax for parameter queries used `token_parameters`. Expand the below for details on how to migrate to the recommended syntax above.
</Note>

<Accordion title="Previous Syntax">
  The previous syntax for parameter queries used `token_parameters.user_id` to return the JWT subject. Example:

  ```yaml
  bucket_definitions:
    by_user_parameter:
      parameters: SELECT token_parameters.user_id as user_id
      data:
        - SELECT * FROM lists WHERE lists.owner_id = bucket.user_id
  ```

  ### Migrate to Recommended Syntax

  The new functions available in sync rules are:

  1. `request.jwt()`: Returns the entire (signed) JWT payload as a JSON string.

  2. `request.parameters()`: Returns [client parameters](/usage/sync-rules/advanced-topics/client-parameters) as a JSON string.

  3. `request.user_id()`: Returns the token subject, same as `request.jwt() ->> 'sub'` and also the same as `token_parameters.user_id` in the previous syntax.

  The major difference from the previous `token_parameters` is that all payloads are preserved as-is, which can make usage a little more intuitive. This also includes JWT payload fields that were not previously accessible.

  Migrating to the new syntax:

  1. `token_parameters.user_id` references can simply be updated to `request.user_id()`

  2. Custom parameters can be updated from `token_parameters.my_custom_field` to `request.jwt() ->> 'parameters.my_custom_field'`

     1. This example applies if you keep your existing custom JWT as is.

     2. Auth users can now make use of [Supabase's standard JWT structure](https://supabase.com/docs/guides/auth/jwts#jwts-in-supabase) and reference `app_metadata.my_custom_field` directly.

  Example:

  ```yaml
  bucket_definitions:
    by_user_parameter:
      # request.user_id() is the same as the previous token_parameter.user_id
      parameters: SELECT request.user_id() as user_id
      data:
        - SELECT * FROM lists WHERE lists.owner_id = bucket.user_id
  ```
</Accordion>

#### Filter on additional columns

```yaml
bucket_definitions:
  admin_users:
    parameters: |
        SELECT id as user_id FROM users WHERE
           users.id = request.user_id() AND
           users.is_admin = true

    data:
      - SELECT * FROM lists WHERE lists.owner_id = bucket.user_id
```

#### Group according to different columns

```yaml
bucket_definitions:
  primary_list:
    parameters: |
        SELECT primary_list_id FROM users WHERE
           users.id = request.user_id()
    data:
      - SELECT * FROM todos WHERE todos.list_id = bucket.primary_list_id
```

#### Using different tables for parameters

```yaml
bucket_definitions:
  owned_lists:
    parameters: |
        SELECT id as list_id FROM lists WHERE
           owner_id = request.user_id()
    data:
      - SELECT * FROM lists WHERE lists.id = bucket.list_id
      - SELECT * FROM todos WHERE todos.list_id = bucket.list_id
```

#### Using a join table

In this example, a single query can return multiple sets of bucket parameters for a single user.

Keep in mind that the total number of buckets per user should remain limited (\< 1,000), so don't make buckets too granular.

```yaml
bucket_definitions:
  user_lists:
    parameters: |
        SELECT list_id FROM user_lists WHERE
           user_lists.user_id = request.user_id()
    data:
      - SELECT * FROM lists WHERE lists.id = bucket.list_id
      - SELECT * FROM todos WHERE todos.list_id = bucket.list_id
```

#### Multiple bucket parameters

Parameter queries may return multiple bucket parameters.

<Info>
  **Note that every bucket parameter must be used in every data query.**
</Info>

```yaml
bucket_definitions:
  owned_org_lists:
    parameters: |
        SELECT id as list_id, org_id FROM lists WHERE
           owner_id = request.user_id()
    data:
      - SELECT * FROM lists WHERE lists.id = bucket.list_id and lists.org_id = bucket.org_id
      - SELECT * FROM todos WHERE todos.list_id = bucket.list_id and todos.org_id = bucket.org_id
```

#### Using multiple parameter queries

Multiple parameter queries can be used in the same bucket definition.

It is important in this case that the output columns are exactly the same for each query in the bucket definition, as these define the bucket parameters.

```yaml
bucket_definitions:
  user_lists:
    parameters:
      - SELECT id as list_id FROM lists WHERE owner_id = request.user_id()
      - SELECT list_id FROM user_lists WHERE user_lists.user_id = request.user_id()
    data:
      - SELECT * FROM lists WHERE lists.id = bucket.list_id
      - SELECT * FROM todos WHERE todos.list_id = bucket.list_id
```

Keep in mind that the total number of buckets per user should remain limited (\< 1,000), so don't make buckets too granular.

#### Pass parameters from clients

It is possible to pass parameters from clients directly. See [client parameters](/usage/sync-rules/advanced-topics/client-parameters) to learn more.

#### Global buckets

Global buckets are buckets with no bucket parameters. This means there is a single bucket for the bucket definition.

When no parameter query is specified, it is automatically a global bucket.

Alternatively, a parameter query with no output columns may be specified to only sync the bucket to a subset of users.

```yaml
bucket_definitions:
  global_admins:
    parameters: |
        SELECT FROM users WHERE
           users.id = request.user_id() AND
           users.is_admin = true

    data:
      - SELECT * FROM admin_settings
```

## Restrictions

Parameter queries are not run directly on a database. Instead, the queries are used to pre-process rows/documents as they are replicated, and index them for efficient use in the sync process.

The supported SQL is based on a small subset of the SQL standard syntax.

Notable features and restrictions:

1. Only simple `SELECT` statements are supported.

2. No `JOIN`, `GROUP BY` or other aggregation, `ORDER BY`, `LIMIT`, or subqueries are supported.

3. For token parameters, only `=` operators are supported, and `IN` to a limited extent.

4. A limited set of operators and functions are supported — see [Operators and Functions](/usage/sync-rules/operators-and-functions).

# Schemas and Connections
Source: https://docs.powersync.com/usage/sync-rules/schemas-and-connections

## Schemas (Postgres)

When no schema is specified, the Postgres `public` schema is used for every query. A different schema can be specified as a prefix:

```sql
-- Note: the schema must be in double quotes
SELECT * FROM "other"."assets"
```

## High Availability / Replicated Databases (Postgres)

When the source Postgres database is replicated, for example with Amazon RDS Multi-AZ deployments, specify a single connection with multiple host endpoints. Each host endpoint will be tried in sequence, with the first available primary connection being used.

For this, each endpoint must point to the same physical database, with the same replication slots. This is the case when block-level replication is used between the databases, but not when streaming physical or logical replication is used. In those cases, replication slots are unique on each host, and all data would be re-synced in a fail-over event.

## Multiple Separate Database Connections (Planned)

<Info>
  This feature will be available in a future release. See this [item on our roadmap](https://roadmap.powersync.com/c/84-support-for-sharding-multiple-database-connections).
</Info>

In the future, it will be possible to configure PowerSync with multiple separate backend database connections, where each connection is concurrently replicated.

You should not add multiple connections to multiple replicas of the same database — this would cause data duplication. Only use this when the data on each connection does not overlap.

It will be possible for each connection to be configured with a "tag", to distinguish these connections in Sync Rules. The same tag may be used for multiple connections (if the schema is the same in each).

By default, queries will reference the "default" tag. To use a different connection or connections, assign a different tag, and specify it in the query as a schema prefix. In this case, the schema itself must also be specified.

```sql
-- Note the usage of quotes here
SELECT * FROM "secondconnection.public"."assets"
```

# Types
Source: https://docs.powersync.com/usage/sync-rules/types

PowerSync's Sync Rules use the [SQLite type system](https://www.sqlite.org/datatype3.html).

The supported client-side SQLite types are:

1. `null`
2. `integer`: a 64-bit signed integer
3. `real`: a 64-bit floating point number
4. `text`: An UTF-8 text string
5. `blob`: Binary data

## <Icon icon="elephant" iconType="solid" size="24" /> Postgres Type Mapping

Binary data in Postgres can be accessed in Sync Rules, but cannot be synced directly to clients (it needs to be converted to hex or base64 first — see below), and cannot be used as bucket parameters.

Postgres values are mapped according to this table:

| Postgres Data Type | PowerSync / SQLite Column Type | Notes                                                                                                                                                                                                                                   |
| ------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| text, varchar      | text                           |                                                                                                                                                                                                                                         |
| int2, int4, int8   | integer                        |                                                                                                                                                                                                                                         |
| numeric / decimal  | text                           | These types have arbitrary precision in Postgres, so can only be represented accurately as text in SQLite                                                                                                                               |
| bool               | integer                        | 1 for true, 0 for false                                                                                                                                                                                                                 |
| float4, float8     | real                           |                                                                                                                                                                                                                                         |
| enum               | text                           |                                                                                                                                                                                                                                         |
| uuid               | text                           |                                                                                                                                                                                                                                         |
| timestamptz        | text                           | Format: `YYYY-MM-DD hh:mm:ss.sssZ`. This is compatible with ISO8601 and SQLite's functions. Precision matches the precision used in Postgres. `-infinity` becomes `0000-01-01 00:00:00Z` and `infinity` becomes `9999-12-31 23:59:59Z`. |
| timestamp          | text                           | Format: `YYYY-MM-DD hh:mm:ss.sss`. In most cases, timestamptz should be used instead. `-infinity` becomes `0000-01-01 00:00:00` and `infinity` becomes `9999-12-31 23:59:59`.                                                           |
| date, time         | text                           |                                                                                                                                                                                                                                         |
| json, jsonb        | text                           | There is no dedicated JSON type — JSON functions operate directly on text values.                                                                                                                                                       |
| interval           | text                           |                                                                                                                                                                                                                                         |
| macaddr            | text                           |                                                                                                                                                                                                                                         |
| inet               | text                           |                                                                                                                                                                                                                                         |
| bytea              | blob                           | Cannot sync directly to client — convert to hex or base64 first. See [Operators & Functions](/usage/sync-rules/operators-and-functions).                                                                                                |
| geometry (PostGIS) | text                           | hex string of the binary data Use the [ST functions](/usage/sync-rules/operators-and-functions#functions) to convert to other formats                                                                                                   |

There is no dedicated boolean data type. Boolean values are represented as `1` (true) or `0` (false).

`json` and `jsonb` values are treated as `text` values in their serialized representation. JSON functions and operators operate directly on these `text` values.

## <Icon icon="leaf" iconType="solid" size="24" /> MongoDB (Beta) Type Mapping

<Info>
  This section is a work in progress. More details for MongoDB connections are coming soon. In the meantime, check our [MongoDB guide](/migration-guides/mongodb-atlas) to try out our MongoDB database support, and ask on our [Discord server](https://discord.gg/powersync) if you have any questions.
</Info>

| BSON Type          | PowerSync / SQLite Column Type | Notes                                                                                                                                    |
| ------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| String             | text                           |                                                                                                                                          |
| Int, Long          | integer                        |                                                                                                                                          |
| Double             | real                           |                                                                                                                                          |
| Decimal128         | text                           |                                                                                                                                          |
| Object             | text                           | Converted to a JSON string                                                                                                               |
| Array              | text                           | Converted to a JSON string                                                                                                               |
| ObjectId           | text                           | Lower-case hex string                                                                                                                    |
| UUID               | text                           | Lower-case hex string                                                                                                                    |
| Boolean            | integer                        | 1 for true, 0 for false                                                                                                                  |
| Date               | text                           | Format: `YYYY-MM-DD hh:mm:ss.sss`                                                                                                        |
| Null               | null                           |                                                                                                                                          |
| Binary             | blob                           | Cannot sync directly to client — convert to hex or base64 first. See [Operators & Functions](/usage/sync-rules/operators-and-functions). |
| Regular Expression | text                           | JSON text in the format `{"pattern":"...","options":"..."}`                                                                              |
| Timestamp          | integer                        | Converted to a 64-bit integer                                                                                                            |
| Undefined          | null                           |                                                                                                                                          |
| DBPointer          | text                           | JSON text in the format `{"collection":"...","oid":"...","db":"...","fields":...}`                                                       |
| JavaScript         | text                           | JSON text in the format `{"code": "...", "scope": ...}`                                                                                  |
| Symbol             | text                           |                                                                                                                                          |
| MinKey, MaxKey     | null                           |                                                                                                                                          |

* Data is converted to a flat list of columns, one column per top-level field in the MongoDB document.
* Special BSON types are converted to plain SQLite alternatives.
* For example, `ObjectId`, `Date`, `UUID` are all converted to a plain `TEXT` column.
* Nested objects and arrays are converted to JSON arrays, and JSON operators can be used to query them (in the Sync Rules and/or on the client-side).
* Binary data nested in objects or arrays is not supported.

## <Icon icon="dolphin" iconType="solid" size="24" /> MySQL (Alpha) Type Mapping

<Info>
  This section is a work in progress. More details for MySQL connections are coming soon. In the meantime, ask on our [Discord server](https://discord.gg/powersync) if you have any questions.
</Info>

# Tools
Source: https://docs.powersync.com/usage/tools

<CardGroup>
  <Card title="PowerSync Dashboard" icon="clapperboard" href="/usage/tools/powersync-dashboard" horizontal />

  <Card title="CLI (Beta)" icon="terminal" href="/usage/tools/cli" horizontal />

  <Card title="Diagnostics App" icon="stethoscope" href="https://github.com/powersync-ja/powersync-js/tree/main/tools/diagnostics-app" horizontal />

  <Card title="Monitoring and Alerting" icon="bell" href="/usage/tools/monitoring-and-alerting" horizontal />

  <Card title="CloudCode (for MongoDB Backend Functionality)" icon="database" href="/usage/tools/cloudcode" horizontal />
</CardGroup>

# CLI (Beta)
Source: https://docs.powersync.com/usage/tools/cli

Manage your PowerSync Cloud environment programmatically

You can use the [PowerSync CLI](https://www.npmjs.com/package/powersync) to manage your PowerSync Cloud instances from your machine. Specifically, you can:

* Manage your [PowerSync instances ](/architecture/powersync-service)(PowerSync Cloud)
* Validate and deploy [sync rules](/usage/sync-rules) to an instance from a local file
* Generate the [client-side schema](/installation/client-side-setup/define-your-schema)

<Note>
  The PowerSync CLI is not yet compatible with managing [self-hosted](/self-hosting/getting-started) PowerSync instances (PowerSync Open Edition and PowerSync Enterprise Self-Hosted Edition). This is on our roadmap.
</Note>

### Getting started

To begin, initialize the CLI via `npx`:

```bash
npx powersync init
```

### Personal Access Token

```bash
npx powersync init

? Enter your API token: [hidden]
```

You need to provide an access (API) token to initialize the CLI. These can be created in the [Dashboard](/usage/tools/powersync-dashboard), using the **Create Personal Access Token** action (search for it using the [command palette](/usage/tools/powersync-dashboard#the-command-palette)).

Use the **Revoke Personal Access Token** action to revoke access.

### Usage

For more information on the available commands, please refer to:

<Card title="npm: powersync" icon="npm" href="https://www.npmjs.com/package/powersync" horizontal>
  npm
</Card>

### Known issues and limitations

* When deploying sync rules from the CLI, the `sync-rules.yaml` file shown in the [PowerSync Dashboard](/usage/tools/powersync-dashboard) could be out of date. You can run the **Compare deployed sync rules** [action](/usage/tools/powersync-dashboard#actions) in the Dashboard to review the latest deployed sync rules.
* Certificates cannot currently be managed from the CLI.
* The PowerSync CLI is not yet compatible with managing [self-hosted](/self-hosting/getting-started) PowerSync instances (PowerSync Open Edition and PowerSync Enterprise Self-Hosted Edition). This is on our roadmap.

# CloudCode (for MongoDB Backend Functionality)
Source: https://docs.powersync.com/usage/tools/cloudcode

As of January 2025, we've started adding optional backend functionality for PowerSync that handles writing to a backend database (with initial support for MongoDB) and generating JWTs.

This makes PowerSync easier to implement for developers who prefer not having to maintain their own backend code and infrastructure (PowerSync's [usual architecture](/installation/app-backend-setup) is to use your own backend to process writes and generate JWTs).

We are approaching this in phases, and phase 1 allows using the CloudCode feature of JourneyApps Platform, a [sibling product](https://www.powersync.com/company) of PowerSync. [CloudCode](https://docs.journeyapps.com/reference/cloudcode/cloudcode-overview) is a serverless cloud functions engine based on Node.js and AWS Lambda. It's provided as a fully-managed service running on the same cloud infrastructure as the rest of PowerSync Cloud. PowerSync and JourneyApps Platform share the same login system, so you don’t need to create a separate account to use CloudCode.

<Info>
  We are currently making JourneyApps Platform CloudCode available for free to all our customers who use PowerSync with MongoDB. It does require a bit of "white glove" onboarding from our team. [Contact us](/resources/contact-us) if you want to use this functionality.
</Info>

Phase 2 on our roadmap involves fully integrating CloudCode into the PowerSync Cloud environment. For more details, see [this post on our blog](https://www.powersync.com/blog/turnkey-backend-functionality-conflict-resolution-for-powersync).

# Using CloudCode in JourneyApps Platform for MongoDB Backend Functionality

There is a MongoDB template available in CloudCode that provides the backend functionality needed for a PowerSync MongoDB implementation. Here is how to use it:

## Create a new JourneyApps Platform project

To create a new JourneyApps Platform project in order to use CloudCode:

<Steps>
  <Step>
    Navigate to the [JourneyApps Admin Portal](https://accounts.journeyapps.com/portal/admin). You should see a list of your projects if you've created any.

    <Frame>
      <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage/tools/JourneyApps_Project_1.png" />
    </Frame>
  </Step>

  <Step>
    Select **Create Project** at the top right of the screen.

    <Frame>
      <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage/tools/JourneyApps_Project_2.png" />
    </Frame>
  </Step>

  <Step>
    Select **JourneyApps Platform Project** and click **Next**.

    <Frame>
      <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage/tools/JourneyApps_Project_3.png" />
    </Frame>
  </Step>

  <Step>
    Enter a project name and click **Next**.

    <Frame>
      <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage/tools/JourneyApps_Project_4.png" />
    </Frame>
  </Step>

  <Step>
    There are options available for managing version control for the project. For simplicity we recommend selecting **Basic (Revisions)** and **JourneyApps** as the Git provider.

    <Frame>
      <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage/tools/JourneyApps_Project_5.png" />
    </Frame>
  </Step>

  <Step>
    Select **TypeScript** as your template language, and `MongoDB CRUD & Auth Backend` as your template. Then click **Create App**.

    <Frame>
      <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage/tools/JourneyApps_Project_6.png" />
    </Frame>
  </Step>
</Steps>

## Overview of the CloudCode tasks created from the template

To view the CloudCode tasks that were created in the new project using this template, select **CloudCode** at the top of the IDE:

<Frame>
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage/tools/CloudCode.png" />
</Frame>

Here you will find four CloudCode tasks:

<Frame>
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage/tools/CloudCode-tasks.png" />
</Frame>

Here's the purpose of each task:

1. `generate_keys` - This is a task that can be used to generate a private/public key pair which the `jwks` and `token` tasks (see below) require.

<Warning>
  The `generate_keys` task does not expose an HTTP endpoint and should only be used for development and getting started.
</Warning>

2. `jwks` - This task [exposes an HTTP endpoint](https://docs.journeyapps.com/reference/cloudcode/triggering-a-cloudcode-task/trigger-cc-via-http) which has a `GET` function which returns the public [JWKS](https://stytch.com/blog/understanding-jwks/) details.
3. `token` - This task exposes an HTTP endpoint which has a `GET` function. The task is used by a PowerSync client to generate a token to validate against the PowerSync Service.
   For more information about custom authentication setups for PowerSync, please [see here](https://docs.powersync.com/installation/authentication-setup/custom).
4. `upload` - This task exposes an HTTP endpoint which has a `POST` function which is used to process the write events from a PowerSync client and writes it back to the source MongoDB database.

## Setup

### 1. Generate key pair

Before using the CloudCode tasks, you need to generate a public/private key pair. Do the following to generate the key pair:

1. Open the `generate_keys` CloudCode task.
2. Select the **Test CloudCode Task** button at the top right. This will print the public and private key in the task logs window.

<Frame>
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage/tools/test-cloudcode-task.png" />
</Frame>

3. Copy and paste the `POWERSYNC_PUBLIC_KEY` and `POWERSYNC_PRIVATE_KEY` to a file — we'll need this in the next step.

<Note>
  This step is only meant for testing and development because the keys are shown in the log files.
  For production, [generate a key pair locally](https://github.com/powersync-ja/powersync-jwks-example?tab=readme-ov-file#1-generate-a-key-pair) and move onto step 2 and 3.
</Note>

### 2. Configure a deployment

Before using the tasks, we need to configure a "deployment".

1. At the top of the IDE, select **Deployments**.
2. Create a new deployment by using the **+** button at the top right, *or* use the default `Testing` deployment. You can configure different deployments for different environments (e.g. staging, production)
3. Now select the **Deployment settings** button for the instance.
4. In the **Deployment settings** - **General** tab, capture a **Domain** value in the text field. This domain name determines where the HTTP endpoints exposed by these CloudCode tasks can be accessed. The application will validate the domain name to make sure it's available.
5. Select **Save**.
6. Deploy the deployment: you can do so by selecting the **Deploy app** button, which can be found on the far right for each of the deployments you have configured. After the deployment is completed, it will take a few minutes for the domain to be available.
7. Your new domain will be available at `<domain_name>.poweredbyjourney.com`. Open the browser and navigate to the new domain. You should be presented with `Cannot GET /`, because there is no index route.

### 3. Configure environment variables

To wrap up the deployment, we need to configure some environment variables. The following variables need to be set on the deployment:

* `POWERSYNC_PUBLIC_KEY` - This is the `POWERSYNC_PUBLIC_KEY` from the values generated in step 1.
* `POWERSYNC_PRIVATE_KEY` - This is the `POWERSYNC_PRIVATE_KEY` from the values generated in step 1.
* `MONGO_URI` - This is the MongoDB URI e.g. `mongodb+srv://<username>:<password>@<database_domain>/<database>`
* `POWERSYNC_URL` - This is the public PowerSync URL that is provided after creating a new PowerSync instance.

To add environment variables, do the following:

1. Head over to the **Deployment settings** option again.
2. Select the **Environment Variables** tab.

<Frame>
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage/tools/cloudcode-envvar.png" />
</Frame>

3. Capture the variable name in the **Name** text field.
4. Capture the variable value in the **Value** text field.
5. (Suggested) Check the **Masked** checkbox to obfuscate the variable value for security purposes.
6. Repeat until all the variables are added.

To finalize the setup, do the following:

1. Select the **Save** button. This is important, otherwise the variables will not save.
2. Deploy the deployment: you can do so by selecting the **Deploy app** button.

### 4. Test

Open your browser and navigate to `<domain_name>.poweredbyjourney.com/jwks`.

If the setup was successful, the `jwks` task will render the keys in JSON format. Make sure the format of your JWKS keys matches the format [in this example](https://hlstmcktecziostiaplz.supabase.co/functions/v1/powersync-jwks) JWKS endpoint.

## Usage

Make sure you've configured a deployment and set up environment variables as described in the **Setup** steps above before using the HTTP API endpoints exposed by the CloudCode tasks:

### Token

You would call the `token` HTTP API endpoint when you [implement](/installation/client-side-setup/integrating-with-your-backend) the `fetchCredentials()` function on the client application.

Send an HTTP GET request to `<domain_name>.poweredbyjourney.com/token?user_id=<user_id>` to fetch a JWT for a user. You must provide a `user_id` in the query string of the request, as this is included in the JWT that is generated.

The response of the request would look like this:

```json
{"token":"..."}
```

### JWKS

The `jwks` HTTP API endpoint is used by PowerSync to validate the token returned from the `<domain_name>.poweredbyjourney.com/token` endpoint. This URL must be set in the configuration of your PowerSync instance.

Send an HTTP GET request to `<domain_name>.poweredbyjourney.com/jwks`.

An example of the response format can be found using [this link](https://hlstmcktecziostiaplz.supabase.co/functions/v1/powersync-jwks).

### Upload

You would call the `upload` HTTP API endpoint when you [implement](/installation/client-side-setup/integrating-with-your-backend) the `uploadData()` function on the client application.

Send an HTTP POST request to `<domain_name>.poweredbyjourney.com/upload`.

The body of the request payload should look like this:

```json
{
  "batch": [{
    "op": "PUT",
    "table": "lists",
    "id": "61d19021-0565-4686-acc4-3ea4f8c48839",
    "data": {
      "created_at": "2024-10-31 10:33:24",
      "name": "Name",
      "owner_id": "8ea4310a-b7c0-4dd7-ae54-51d6e1596b83"
    }
  }]
}
```

* `batch` should be an array of operations from the PowerSync client SDK.
* `op` refers to the type of each operation recorded by the PowerSync client SDK (`PUT`, `PATCH` or `DELETE`). Refer to [Writing Client Changes](/installation/app-backend-setup/writing-client-changes) for details.
* `table` refers to the table in SQLite where the operation originates from, and should match the name of a collection in MongoDB.

The API will respond with HTTP status `200` if the write was successful.

## Customization

You can make changes to the way the `upload` task writes data to the source MongoDB database.

Here is how:

1. Go to **CloudCode** at the top of the IDE in your JourneyApps Platform project
2. Select and expand the `upload` task in the panel on the left.
3. The `index.ts` contains the entry point function that accepts the HTTP request and has a `MongoDBStorage` class which interacts with the MongoDB database to perform inserts, updates and deletes. To adjust how updates are performed, take a look at the `updateBatch` function.

## Production considerations

Before going into production with this solution, you will need to set up authentication on the HTTP endpoints exposed by the CloudCode tasks.

If you need more data validations and/or authorization than what is provided by the template, that will need to be customized too. Consider introducing schema validation of the data being written to the source MongoDB database. You should use a [purpose-built](https://json-schema.org/tools?query=\&sortBy=name\&sortOrder=ascending\&groupBy=toolingTypes\&licenses=\&languages=\&drafts=\&toolingTypes=\&environments=\&showObsolete=false) library for this, and use [MongoDB Schema Validation](https://www.mongodb.com/docs/manual/core/schema-validation/) to enforce the types in the database.

Please [contact us](/resources/contact-us) for assistance on any of the above.

# Diagnostics App
Source: https://docs.powersync.com/usage/tools/diagnostic-app

# Monitoring and Alerting
Source: https://docs.powersync.com/usage/tools/monitoring-and-alerting

Overview of monitoring and alerting functionality for PowerSync Cloud instances

You can monitor activity and alert on issues and usage for your PowerSync Cloud instance(s):

* **Monitor Usage**: View time-series and aggregated usage data with [Usage Metrics](#usage-metrics)

* **Monitor Service and Replication Activity**: Track your PowerSync Service and replication logs with [Instance Logs](#instance-logs)

* **Configure Alerts**: Set up alerts for replication issues or usage activity \*

  * Includes [Issue Alerts](#issue-alerts) and/or [Metric Alerts](#metric-alerts)

* **Webhooks**: Set up [Webhooks](#webhooks) to report events (like issue or metric alerts) to external systems \*

These features can assist with troubleshooting common issues (e.g. replication errors due to a logical replication slot problem), investigating usage spikes, or being notified when usage exceeds a specific threshold.

\* The availability of these features depends on your PowerSync Cloud plan. See the table below for a summary. More details are provided further below.

### Summary of Feature Availability (by PowerSync Cloud Plan)

Monitoring and alerting functionality varies by [PowerSync Cloud plan](https://www.powersync.com/pricing), and is being rolled out in phases. This table provides a summary of availability:

| Feature                  | Free                  | Pro                                    | Team & Enterprise                      |
| ------------------------ | --------------------- | -------------------------------------- | -------------------------------------- |
| **Usage Metrics**        | Available             | Available                              | Available                              |
| **Instance Logs**        | Available             | Available                              | Available                              |
| **Log retention period** | 24 hours              | 7 days                                 | 30 days                                |
| **Issue Alerts**         | Available             | Available                              | Available                              |
| **Metric Alerts**        | Not available         | Not available                          | Available                              |
| **Alert Notifications**  | - Email (Coming soon) | - Webhooks <br />- Email (Coming soon) | - Webhooks <br />- Email (Coming soon) |

<Info>
  **Self-hosting PowerSync**

  Similar monitoring and alerting functionality is planned for PowerSync Open Edition users and Enterprise Self-Hosted customers.

  For Open Edition users, alerting APIs are currently available in an early access release. For Enterprise Self-Hosted customers we are planning a full alerting service that includes customizable alerts and webhook integrations.

  Until this is available, please chat to us on our [Discord](https://discord.gg/powersync) to discuss your use case or any questions.
</Info>

## Usage Metrics

View time-series and aggregated usage data for your PowerSync instance(s), including storage size, concurrent connections, and synced data and operations. This data lets you monitor activity, spot patterns or spikes, and easily budget while tracking your position within our [Cloud pricing plans](https://www.powersync.com/pricing).

### View Usage Metrics

Access usage metrics in the [Dashboard](/usage/tools/powersync-dashboard), in the **Metrics** workspace:

<Frame>
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage-metrics.png" />
</Frame>

You have following options:

* **Filter options**: data by time range.

* **Granularity**: See data in a daily or hourly granularity.

* **Aggregates**: View and copy aggregates for each usage metric.

* **CSV**: Download data as CSV for custom calculations.

<Info>
  This usage data is also available programmatically via APIs in an early access release. Chat to us on our [Discord](https://discord.gg/powersync) if you require details.
</Info>

## Instance Logs

You can review logs for your PowerSync instance(s) to troubleshoot replication or sync service issues. Logs capture activity from the PowerSync Service and Replicator processes.

* **Service logs**: Reflect sync processes from the PowerSync Service to clients.

* **Replicator logs**: Reflect replication activity from your source database to the PowerSync Service.

<Note>
  **Availability**

  The log retention period varies by plan:

  * **Free** plan: Logs from the last 24 hours

  * **Pro** plan: Logs from the last 7 days

  * **Team & Enterprise** plans: Logs from the last 30 days
</Note>

### View Instance Logs

Access instance logs through the [Dashboard](/usage/tools/powersync-dashboard), in the **Instance logs** workspace (or by searching for the panel using the [command palette](/usage/tools/powersync-dashboard#the-command-palette)):

<Frame>
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/resources/view-instance-logs.png" />
</Frame>

You can manage logs with the following options:

* **Filter Options**: Filter logs by level (`Note`, `Error`, `Warning`, `Debug`) and by date range.

* **Sorting**: Sort logs by newest or oldest first.

* **Service Logs Metadata**: Include metadata like `user_id` and `user_agent` in the logs if available.

* **View Mode**: Tail logs in real-time or view them statically.

* **Stack Traces**: Option to show or hide stack traces for errors.

## Issue Alerts

Issue alerts capture potential problems with your instance, such as connection or sync issues.

<Note>
  **Availability**

  * Issue alerts are available on all Cloud plans.
</Note>

### Configure Issue Alerts

Issue alerts are set up per instance. To set up a new alert, navigate to your **PowerSync Project tree**, right-click on the "Issue Alerts" option under the selected instance, and follow the prompts.

<Frame>
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/instance-alerts-dashboard.png" width="50%" />
</Frame>

You can set up alerts that trigger under certain conditions:

* **Connection Issues**: Trigger when there is a connection problem

* **Replication/Sync Issues**: Trigger when there is an issue with a replication or sync process

#### Severity Level

You also have the option to set the severity level of the alerts. For example, you can configure alerts to trigger only for `warning` and/or `fatal` issues. Free and Pro plan customers can only configure `fatal` alerts.

### View Issue Alerts

Once you have created an alert, you can right-click on it to open the alert logs. The logs panel includes the option to filter alerts by date range.

This command and other configuration options are also available from the [command palette](/usage/tools/powersync-dashboard#the-command-palette) (SHIFT+SHIFT):

<Frame>
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/resources/view-issue-alert-logs-cmd.png" />
</Frame>

### **Alert Notifications**

See [Webhooks](#webhooks) below to notify external systems when an alert is triggered.

## Metric Alerts

Metric alerts trigger when specific usage metrics exceed a defined threshold. This helps with troubleshooting usage spikes, or unexpected usage activity.

<Note>
  **Availability**

  Metrics alerts are available on **Team** and **Enterprise** plans.
</Note>

### Configure Metric Alerts

Metric alerts are set up per instance. Navigate to your **PowerSync Project** tree, and right-click on the **Metric Alerts** option under your selected instance to create a new alert.

<Frame>
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/instance-alerts-dashboard.png" width="50%" />
</Frame>

You can set alerts for the following usage metrics:

* **Data Synced**

* **Data Replicated**

* **Operations Synced**

* **Operations Replicated**

* **Peak Concurrent Connections**

* **Storage Size**

Thresholds can be set to trigger alerts when usage exceeds or falls below a specified value.

### View Metric Alert Logs

Once you have created an alert, you can right-click on it to open the alert logs. The logs panel includes the option to filter alerts by date range.

This command and other configuration options are also available from the [command palette](/usage/tools/powersync-dashboard#the-command-palette) (SHIFT+SHIFT):

<Frame>
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/resources/view-metric-alert-logs-cmd.png" />
</Frame>

### **Alert Notifications**

See [Webhooks](#webhooks) below to notify external systems when an alert is triggered.

## Webhooks

Webhooks enable you to notify external systems when specific events occur in PowerSync, such as issue or metric alerts.

<Note>
  **Availability**

  * Webhooks are currently available on **Pro**, **Team** and **Enterprise** plans.

  * Email notifications will be available in a future release (these will also be available to **Free** plan users).
</Note>

### Set Up Webhooks

Navigate to the **Webhooks** section in your **PowerSync Project** tree, and right-click on it to create a new webhook for your project.

<Frame>
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/instance-alerts-dashboard.png" width="50%" />
</Frame>

#### Configuration

* **Specify Webhook Endpoint**: Define the endpoint that will receive the webhook request (starting with `https://`).

* **Event Triggers**: Select one or more of the following events to trigger the webhook:

  * Issue alert state change

  * Metric alert state change (Team & Enterprise plan only)

  * Deploy state change (Team & Enterprise plan only)

You can control how webhooks operate:

* Enable, disable, or pause a webhook

  * If paused, invocations can still be generated and queued, but they won't be processed

  * If disabled, invocations won't be generated

* Choose sequential or concurrent execution

  * If concurrent, you can set the maximum number of concurrent invocations

* Configure retry attempts for failed webhook deliveries

#### Webhook secret

After creating a webhook, a secret is automatically generated and copied to your clipboard. Store this secret since you'll need it to verify the webhook request signature. See [Webhook Signature Verification](#webhook-signature-verification)

### Test Webhooks

A test webhook can be sent to your specified endpoint to verify your setup. Right-click on a webhook in the **PowerSync project** tree and select the **Test Webhook** option:

<Frame>
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/resources/test-webhook-cmd.png" />
</Frame>

### Webhook Signature Verification

Every webhook request contains an `x-journey-signature` header, which is a base64-encoded HMAC (Hash-based Message Authentication Code). To verify the request, you need to compute the HMAC using the shared secret that was generated when you created the webhook, and compare it to the value in the `x-journey-signature` header.

**JavaScript Example**

```javascript
import { createHmac } from 'crypto';

// Extract the signature from the request headers
const signature = request.headers['x-journey-signature'];

// Create an HMAC using your webhook secret and the request body
let verify = createHmac('sha256', '<webhook_secret_here>') // The secret provided during webhook setup
    .update(Buffer.from(request.rawBody, 'utf-8'))
    .digest('base64');

// Compare the computed HMAC with the signature from the request
if (signature === verify) {
    console.log("success");
} else {
    console.log("verification failed");
}
```

#### Regenerate secret

You can regenerate the secret used to validate the webhook signature. Right-click on a webhook in the PowerSync project tree and select the **Regenerate secret** option.

### View Webhook Invocation Logs

You can review webhook invocation logs in the Dashboard and filter them by date. Right-click on a webhook in the **PowerSync project** tree and select the **View webhook invocation logs** option.

# PowerSync Dashboard
Source: https://docs.powersync.com/usage/tools/powersync-dashboard

Introduction to and overview of the PowerSync Dashboard and Admin Portal

The PowerSync Dashboard is available in [PowerSync Cloud](https://www.powersync.com/pricing) (our cloud-hosted offering) and provides an interface for developers to:

* Manage PowerSync projects
* Manage PowerSync instances
* Write, validate and deploy [sync rules](/usage/sync-rules)
* Generate the [client-side schema](/installation/client-side-setup/define-your-schema)
* Generate [development tokens](/installation/authentication-setup/development-tokens)
* Monitor usage and configure alerts - see [Monitoring and Alerting](/usage/tools/monitoring-and-alerting)

The dashboard is available here: [https://powersync.journeyapps.com/](https://powersync.journeyapps.com/)

### Hierarchy: Organization, project, instance

* After successfully [signing up](https://accounts.journeyapps.com/portal/powersync-signup?s=docs) for PowerSync Cloud, your PowerSync account is created.
* Your account is assigned an **organization** on the [Free pricing plan](https://www.powersync.com/pricing).
* A sample PowerSync **project** (named "PowerSync Project") is automatically created in this organization, and this project is your starting point after completing sign-up. It is opened by default in the dashboard:

<Frame caption="PowerSync dashboard">
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage/tools/dashboard-overview.png" />
</Frame>

* Within a project, you can create and manage one or more PowerSync **instances** for your project (typically developers maintain a staging and production instance). An instance runs a copy of the [PowerSync Service](/architecture/powersync-service) and connects to your Postgres database.

Here is an example of how this hierarchy might be used by a customer:

* **Organization**: Acme Corporation
  * **Project**: Travel App
    * **Instance**: Staging
    * **Instance**: Production

### Dashboard layout

The Dashboard layout is similar to that of an IDE and includes the following main components:

* [Workspaces](/usage/tools/powersync-dashboard#workspaces)
* [Editor Panes, Panels and Files](/usage/tools/powersync-dashboard#editor-panes-panels-and-files)
* [The Command Palette](/usage/tools/powersync-dashboard#the-command-palette)
* [Actions](/usage/tools/powersync-dashboard#actions)

<Frame caption="Dashboard components">
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage/tools/dashboard-components.png" />
</Frame>

#### Workspaces

Workspaces are a pre-configured logical collection of editor panes and panels that are designed to make working on a specific part of your project as easy as possible.

The dashboard comes with four workspaces by default: **Overview**, **Manage instances**, **Usage metrics** and **Instance logs**.

* The **Overview** workspace presents an overview of your PowerSync instances, or guides you through creating your first instance.
* The **Manage instances** workspace is allows you to create, view and update PowerSync instances, validate and deploy sync rules, and view deploy logs by instance.
* The **Usage metrics** workspace displays your project's usage metrics by instance.
* The **Instance logs** workspace displays replication and service logs by instance.

You can customize any of these workspaces (changes save automatically) and/or create new workspaces.

To reset all workspaces to their original layout, run the **Reset workspaces** action (see *Command Palette* and *Actions* below for how to run actions)

#### Editor Panes, Panels and Files

Editor Panes are used to interact with your project's files (e.g. `sync-rules.yaml`) and Panels display information about your project in components that can be positioned and resized.

#### The Command Palette

Open the Command Palette using the keyboard shortcut `CTRL/CMD+SHIFT+P` or `SHIFT+SHIFT`, and access just about anything you need to do in your project.

#### Actions

The various actions available in your project are accessible via the Command Palette, by right-clicking on certain items, and via buttons. These are a few of the most common actions you might need during the lifecycle of your PowerSync project (you can search them via the Command Palette):

* **Generate development token** -> Generate a [development token](/installation/authentication-setup/development-tokens) for authentication
* **Generate client-side schema** -> Generate the [client-side schema](/installation/client-side-setup/define-your-schema) for an instance based off your [sync rules](/usage/sync-rules).
* **Validate sync rules** -> Validate the [sync rules](/usage/sync-rules) defined in your `sync-rules.yaml` against an instance.
* **Deploy sync rules** -> Deploy [sync rules](/usage/sync-rules) as defined in your `sync-rules.yaml` file to an instance.
* **Compare deployed sync rules** -> Compare the [sync rules](/usage/sync-rules) as defined in your `sync-rules.yaml` file with those deployed to an instance.
* **Save changes** -> Save changes to files as a revision when in **Basic Revisions** version control mode (see *Version Control* below)
  * Or **Commit changes** -> Commit changes to files when in **Advanced Git** version control mode.
* **Create Personal Access Token** -> Create an access token scoped to your user, which is needed for the [CLI](/usage/tools/cli).
* **Rename project** -> Rename your PowerSync project.

### Version Control

Your PowerSync projects come with version control built-in. This is useful when working with your project's sync rules file (`sync-rules.yaml`). The default mode is **Basic Revisions**, which allows you to save, view and revert to revisions of your sync rules file. Another mode is **Advanced Git**, which enables a git-based workflow, including commits, branching, and merging. The modes can be toggled for your projects in the Admin Portal (see [below](/usage/tools/powersync-dashboard#admin-portal)).

#### Saving/committing changes

Open the **Changes** panel (find it via the Command Palette) to review any changes and save, or revert to a specific revision/commit.

#### GitHub / Azure Repos integration

The default git provider for projects is our own "JourneyApps" system which does not require any configuration from the developer. It is also possible to use either GitHub or Azure DevOps as your git provider. For this to work, an integration must be added to your organization via the Admin Portal. Read on to learn more.

### Admin Portal

In the Admin Portal you can [manage your PowerSync projects](/usage/tools/powersync-dashboard#manage-powersync-projects), [users](/usage/tools/powersync-dashboard#manage-users) and [integrations](/usage/tools/powersync-dashboard#manage-integrations).

It is available here:

[https://accounts.journeyapps.com/portal/admin/accounts.journeyapps.com](https://accounts.journeyapps.com/portal/admin/)

<Info>
  When in the PowerSync Dashboard, you can also click on the PowerSync icon in the top-left corner to navigate to the Admin Portal.
</Info>

<Frame caption="Admin Portal">
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage/tools/admin-portal.avif" />
</Frame>

<Info>
  **Advanced permissions**: Several functions in the Admin Portal require advanced permissions that you do not have by default after signing up. Please [contact us](/resources/contact-us) to request these permissions. This is a temporary limitation that will be removed in a future release.
</Info>

#### Manage PowerSync projects

In the "Projects" tab, new projects can be created, existing projects can be deleted, and the [version control](/usage/tools/powersync-dashboard#version-control) mode can be changed for a project. If your project uses the **Advanced Git** version control mode, the git provider can also be configured here.

#### Manage users

Select the "Developers" tab to invite team members to your organization or remove their access. Only users with the **Owner** role can manage users.

#### Manage integrations

In the "Integrations" tab, [GitHub or Azure DevOps integrations](/usage/tools/powersync-dashboard#github-azure-repos-integration) can be added in order to configure them as git providers for your project(s).

#### Update organization settings

In the "Settings" tab, you can rename your organization.

#### Update billing details

In the "Billing" tab, you can update your billing details and manage payment cards.

**View subscriptions**

In the "Subscriptions" tab, you can view your active subscription and usage.

See [Pricing](https://www.powersync.co/pricing) for available subscription plans.

# Use Case Examples
Source: https://docs.powersync.com/usage/use-case-examples

Learn how to use PowerSync in common use cases

The following examples are available to help you get started with specific use cases for PowerSync:

<CardGroup>
  <Card title="Attachments / Files" icon="file" href="/usage/use-case-examples/attachments-files" horizontal />

  <Card title="Background Syncing" icon="circle-notch" href="/usage/use-case-examples/background-syncing" horizontal />

  <Card title="CRDTs" icon="code-merge" href="/usage/use-case-examples/crdts" horizontal />

  <Card title="Custom Types, Arrays and JSON" icon="code" href="/usage/use-case-examples/custom-types-arrays-and-json" horizontal />

  <Card title="Data Encryption" icon="lock" href="/usage/use-case-examples/data-encryption" horizontal />

  <Card title="Data Pipelines" icon="code-branch" href="/usage/use-case-examples/custom-write-checkpoints" horizontal />

  <Card title="Full-Text Search" icon="magnifying-glass" href="/usage/use-case-examples/full-text-search" horizontal />

  <Card title="Infinite Scrolling" icon="scroll" href="/usage/use-case-examples/infinite-scrolling" horizontal />

  <Card title="Local-only Usage" icon="laptop" href="/usage/use-case-examples/offline-only-usage" horizontal />

  <Card title="PostGIS" icon="map" href="/usage/use-case-examples/postgis" horizontal />

  <Card title="Prioritized Sync" icon="star" href="/usage/use-case-examples/prioritized-sync" horizontal />
</CardGroup>

## Additional Resources

A growing collection of demo apps and tutorials are also available, showcasing working example implementations and solutions to additional use cases:

<CardGroup>
  <Card title="Demo Apps / Example Projects" icon="laptop-code" href="/resources/demo-apps-example-projects" horizontal />

  <Card title="Tutorials" icon="graduation-cap" href="/tutorials/overview" horizontal />
</CardGroup>

# Attachments / Files
Source: https://docs.powersync.com/usage/use-case-examples/attachments-files

Syncing large attachments/files directly using PowerSync is not recommended.

Smaller files can be stored as base64-encoded data, but syncing many larger files using database rows may cause performance degradation.

On the other hand, PowerSync works well for syncing the attachment metadata, which could include the file path, name, size, and type. The client may then download the file from the storage provider, such as Supabase Storage or AWS S3.

### Helper Packages

We currently have these helper packages available to manage attachments:

| SDK                           | Attachments Helper Package                                                              | Example Implementation                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **React Native / JavaScript** | [powersync-attachments](https://www.npmjs.com/package/@powersync/attachments)           | [To-Do List demo app](https://github.com/powersync-ja/powersync-js/tree/main/demos/react-native-supabase-todolist) |
| **Flutter**                   | [powersync\_attachments\_helper](https://pub.dev/packages/powersync_attachments_helper) | [To-Do List demo app](https://github.com/powersync-ja/powersync.dart/tree/master/demos/supabase-todolist)          |

The example implementations above use [Supabase Storage](https://supabase.com/docs/guides/storage) as storage provider.

* For more information on the use of Supabase as the storage provider, refer to [Handling Attachments](/integration-guides/supabase-+-powersync/handling-attachments)
* To learn how to adapt the implementations to use AWS S3 as the storage provider, see [this tutorial](/tutorials/client/attachments-and-files/aws-s3-storage-adapter)

Note: Attachment helper packages for [Kotlin](/client-sdk-references/kotlin-multiplatform) and [Swift](/client-sdk-references/swift) are planned. [Let us know](/resources/contact-us) if you require this for your project.

# Background Syncing
Source: https://docs.powersync.com/usage/use-case-examples/background-syncing

You might want to run PowerSync operations while the client device is inactive or the app is in the background.

## Flutter

We have done an initial investigation into how background syncing could be accomplished by using Flutter with [workmanager](https://github.com/fluttercommunity/flutter_workmanager/). However, the flow for other frameworks (e.g. React Native) should be quite similar using an equivalent package. Please reach out on our [Discord](https://discord.gg/powersync) for more assistance.

### Guide

We assume you have followed the platform setup guide in the [workmanager README](https://github.com/fluttercommunity/flutter_workmanager/#platform-setup). Note we are running this in the context of our [Supabase To-Do List Demo](https://github.com/powersync-ja/powersync.dart/tree/main/demos/supabase-todolist) app.

In `main.dart`:

```dart
void main() async {
 ...
  const simpleTaskKey = "com.domain.myapp.taskId";
  // Mandatory if the App is obfuscated or using Flutter 3.1+
  @pragma('vm:entry-point')
  void callbackDispatcher() {
    Workmanager().executeTask((task, inputData) async {
      switch (task) {
        case simpleTaskKey:
          final currentConnector = await openDatabase();
          db.connect(connector: currentConnector!);
          await TodoList.create('testing1234');
          await currentConnector.uploadData(db);
          await TodoList.create('testing1111');
          await currentConnector.uploadData(db);
          // print("$simpleTaskKey was executed. inputData = $inputData");
          break;
      }
      await db.close();
      return Future.value(true);
    });
  }

  Workmanager().initialize(
    callbackDispatcher,
    // If enabled it will post a notification whenever the task is running. Handy for debugging tasks
    isInDebugMode: true
  );

  ...
}
```

Note specifically in the switch statement:

```dart
// currentConnector is the connector to the remote DB
// openDatabase sets the db variable to the PowerSync database
final currentConnector = await openDatabase();
// connect PowerSync to the remote database
db.connect(connector: currentConnector!);
// a database write operation
await TodoList.create('Buy new shoes');
// Sync with the remote database
await currentConnector.uploadData(db);
```

1. Since WorkManager executes in a new process, you need to set up the PowerSync local database and connect to the remote database using your connector.
2. Run a write (in the case of this demo app, we create a 'todo list')
3. Make sure to run `currentConnector.uploadData(db);` so that the local write is uploaded to the remote database.

Create a way to test this, e.g. by using a button:

```dart
  ElevatedButton(
  title: const Text("Start the Flutter background service"),
     onTap: () async {
        await Workmanager().cancelAll();
        // print("RUN BACKGROUND TASK");
        await Workmanager().registerOneOffTask(
        simpleTaskKey,
        simpleTaskKey,
        initialDelay: Duration(seconds: 10),
        inputData: <String, dynamic>{
        int': 1,
      },
    );
  },
),
```

Put your app in the background and wait 10 seconds, then check your remote database and it should have the new record.

### Android

This worked with Android.

### iOS

At the time of writing (January 2024), we were only able to get part of this to work using the branch for [this PR](https://github.com/fluttercommunity/flutter_workmanager/pull/511) into workmanager. While testing we were not able to get iOS background fetching to work, however this is most likely an [issue](https://github.com/fluttercommunity/flutter_workmanager/issues/515) with the package.

# CRDTs
Source: https://docs.powersync.com/usage/use-case-examples/crdts

While PowerSync does not use [CRDTs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type) directly as part of its sync or conflict resolution process, CRDT data (from a library such as [Yjs](https://github.com/yjs/yjs) or y-crdt) may be persisted and synced using PowerSync.

This may be useful for cases such as document editing, where last-write-wins is not sufficient for conflict resolution. PowerSync becomes the provider for CRDT data — both for local storage and for propagating changes to other clients.

### Example Implementations

For an example implementation, refer to the following demo built using the PowerSync JavaScript Web SDK:

* [Yjs Document Collaboration Demo](https://github.com/powersync-ja/powersync-js/tree/main/demos/yjs-react-supabase-text-collab)

# Custom Types, Arrays and JSON
Source: https://docs.powersync.com/usage/use-case-examples/custom-types-arrays-and-json

PowerSync is fully compatible with more advanced Postgres types.

Below you can find information on how to use them.

## Custom Types

PowerSync treats custom type columns as text.

### Postgres

Postgres allows developers to create custom data types for columns. Example of creating a custom type:

```sql
create type location_address AS (
    street text,
    city text,
    state text,
    zip numeric
);
```

### Sync Rules

Custom type columns are converted to Text by the PowerSync Service. A column of type `location_address`, as defined above, would be synced to clients as the following string:

`("1000 S Colorado Blvd.",Denver,CO,80211)`

It is not currently possible to extract fields from custom types in sync rules, so the entire column must be synced as text.

### Client SDK

**Schema**

Add your custom type column as a `text()` column in your client-side schema definition:

```dart
Column.text('location')
```

**Writing Changes**

Write the entire updated column value using a string:

```dart
await db.execute('UPDATE todos set location = ? WHERE id = ?', [

  '("1234 Update Street",Denver,CO,80212)',

  'faffcf7a-75f9-40b9-8c5d-67097c6b1c3b'

]);
```

## Arrays

PowerSync treats array columns as JSON text. This means that the SQLite JSON operators can be used on any Array columns.

Additionally, some helper methods such as array membership are available in Sync Rules.

**Note:** Native Postgres arrays, JSON arrays and JSONB arrays are effectively all equivalent in PowerSync.

### Postgres

Array columns are defined in Postgres using the following syntax:

```sql
ALTER TABLE todos

ADD COLUMN unique_identifiers text[];
```

### Sync Rules

Array columns are converted to text by the PowerSync Service. A text array as defined above would be synced to clients as the following string:

`["00000000-0000-0000-0000-000000000000", "12345678-1234-1234-1234-123456789012"]`

**Array Membership**

It's possible to sync rows dynamically based on the contents of array columns using the `IN` operator. For example:

```yaml
bucket_definitions:
  custom_todos:
    # Separate bucket per To-Do list
    parameters: SELECT id AS list_id FROM lists WHERE owner_id = request.user_id()
    data:
      - SELECT * FROM todos WHERE bucket.list_id IN unique_identifiers
```

<Info>
  See these additional details when using the `IN` operator:

  [Operators](/usage/sync-rules/operators-and-functions#operators)
</Info>

### Client SDK

**Schema**

Add your array column as a `text()` column in your client-side schema definition:

```dart
Column.text('unique_identifiers')
```

**Writing Changes**

Write the entire updated column value using a string:

```dart
await db.execute('UPDATE todos set unique_identifiers = ? WHERE id = ?', [
  '["DEADBEEF-DEAD-BEEF-DEAD-BEEFDEADBEEF", "ABCDEFAB-ABCD-ABCD-ABCD-ABCDEFABCDEF"]',
  '00000000-0000-0000-0000-000000000000'
]);
```

<Info>
  Attention Supabase users: Supabase is able to handle writes with arrays, but you'll have to do the conversion from string to array using `jsonDecode` in the connector's `uploadData` function. The default implementation of the`uploadData` function doesn't handle the more complex ones like arrays automatically
</Info>

## JSON and JSONB

The PowerSync Service treats JSON and JSONB columns as text and provides many helpers for working with JSON in Sync Rules.

**Note:** Native Postgres arrays, JSON arrays and JSONB arrays are effectively all equivalent in PowerSync.

### Postgres

JSON columns are represented as:

```sql
ALTER TABLE todos
ADD COLUMN custom_payload json;
```

### Sync Rules

PowerSync treats JSON columns as text and provides transformation functions in Sync Rules such as `json_extract()`.

```yaml
bucket_definitions:
  my_json_todos:
    # Separate bucket per To-Do list
    parameters: SELECT id AS list_id FROM lists WHERE owner_id = request.user_id()
    data:
      - SELECT * FROM todos WHERE json_extract(custom_payload, '$.json_list') = bucket.list_id
```

### Client SDK

**Schema**

Add your JSON column as a `text()` column in your client-side schema definition:

```dart
Column.text('custom_payload')
```

**Writing Changes**

The default implementation of `uploadData` in our Supabase Flutter [To-Do List Demo App](https://github.com/powersync-ja/powersync.dart/tree/master/demos/supabase-todolist) doesn't handle more complex types such as JSON objects automatically. Below is some example Dart code for writing JSON updates back to Supabase:

```dart
import 'dart:convert';

if (op.op == UpdateType.put) {
  var data = Map<String, dynamic>.of(op.opData!);
  ​​if (op.table == 'mytable' && data['myfield'] != null) {
    data['myfield'] = jsonDecode(data['myfield']);
  ​​}
  data['id'] = op.id;
  await table.upsert(data);
}
else if (op.op == UpdateType.patch) {
//etc
```

## Bonus: Mashup

What if we had a column defined as an array of custom types, where a field in the custom type was JSON? Consider the below Postgres schema:

```sql
-- define custom type
CREATE TYPE extended_location AS (
    address_label text,
    json_address json
);

-- add column
ALTER TABLE todos
ADD COLUMN custom_locations extended_location[];
```

# Data Pipelines
Source: https://docs.powersync.com/usage/use-case-examples/custom-write-checkpoints

Use Custom Write Checkpoints to handle asynchronous data uploads, as in chained data pipelines.

<Info>
  **Availability**:
  Custom Write Checkpoints are available for customers on our [Team and Enterprise](https://www.powersync.com/pricing) plans.
</Info>

To ensure [consistency](/architecture/consistency), PowerSync relies on Write Checkpoints. These checkpoints ensure that clients have uploaded their own local changes/mutations to the server before applying downloaded data from the server to the local database.

The essential requirement is that the client must get a Write Checkpoint after uploading its last write/mutation. Then, when downloading data from the server, the client checks whether the Write Checkpoint is part of the largest [sync checkpoint](https://github.com/powersync-ja/powersync-service/blob/main/docs/sync-protocol.md) received from the server (i.e. from the PowerSync Service). If it is, the client applies the server-side state to the local database.

The default Write Checkpoints implementation relies on uploads being acknowledged *synchronously*, i.e. the change persists in the source database (to which PowerSync is connected) before the [`uploadData` call](/installation/client-side-setup/integrating-with-your-backend) completes.

Problems occur if the persistence in the source database happens *asynchronously*. If the client's upload is meant to mutate the source database (and eventually does), but this is delayed, it will effectively seem as if the client's uploaded changes were reverted on the server, and then applied again thereafter.

Chained *data pipelines* are a common example of asynchronous uploads -- e.g. data uploads are first written to a different upstream database, or a separate queue for processing, and then finally replicated to the 'source database' (to which PowerSync is connected).

For example, consider the following data pipeline:

1. The client makes a change locally and the local database is updated.
2. The client uploads this change to the server.
3. The server resolves the request and writes the change into an intermediate database (not the source database yet).
4. The client thinks the upload is complete (i.e. persisted into the source database). It requests a Write Checkpoint from the PowerSync Service.
5. The PowerSync Service increments the replication `HEAD` in the source database, and creates a Write Checkpoint for the client. The Write Checkpoint number is returned and recorded in the client.
6. The PowerSync Service replicates past the previous replication `HEAD` (but the changes are still not present in the source database).
7. It should be fine for the client to apply the state of the server to the local database. But the server state does not include the client's uploaded changes mentioned in #2. This is the same as if the client's uploaded changes were rejected (not applied) by the server. This results in the client reverting the changes in its local database.
8. Eventually the change is written to the source database, and increments the replication `HEAD`.
9. The PowerSync Service replicates this change and sends it to the client. The client then reapplies the changes to its local database.

In the above case, the client may see the Write Checkpoint before the data has been replicated. This will cause the client to revert its changes, then apply them again later when it has actually replicated, causing data to “flicker” in the app.

For these use cases, Custom Write Checkpoints should be implemented.

## Custom Write Checkpoints

*Custom Write Checkpoints* allow the developer to define Write Checkpoints and insert them into the replication stream directly, instead of relying on the PowerSync Service to create and return them. An example of this is having the backend persist Write Checkpoints to a dedicated table which is processed as part of the replication stream.

The PowerSync Service then needs to process the (ordered) replication events and correlate the checkpoint table changes to Write Checkpoint events.

## Example Implementation

A self-hosted Node.js demo with Postgres is available here:

<Card title="Custom Write Checkpoints (NodeJS + Postgres)" icon="github" href="https://github.com/powersync-ja/self-host-demo/tree/main/demos/nodejs-custom-checkpoints/README.md" horizontal />

## Implementation Details

This outlines what a Custom Write Checkpoints implementation entails.

### Custom Write Checkpoint Table

Create a dedicated `checkpoints` table, which should contain the following checkpoint payload information in some form:

```TypeScript
export type CheckpointPayload = {
    /**
     * The user account id
     */
    user_id: string;
    /**
     * The client id relating to the user account.
     * A single user can have multiple clients.
     * A client is analogous to a device session.
     * Checkpoints are tracked separately for each `user_id` + `client_id`.
     */
    client_id: string;
    /**
     * A strictly increasing Write Checkpoint identifier.
     * This number is generated by the application backend.
     */
    checkpoint: bigint;
}
```

### Replication Requirements

Replication events for the Custom Write Checkpoint table (`checkpoints` in this example) need to enabled.

For Postgres, this involves adding the table to the [PowerSync logical replication publication](/installation/database-setup), for example:

```SQL
create publication powersync for table public.lists, public.todos, public.checkpoints;
```

### Sync Rules Requirements

You need to enable the `write_checkpoints` sync event in your Sync Rules configuration. This event should map the rows from the `checkpoints` table to the `CheckpointPayload` payload.

```YAML
# sync-rules.yaml

# Register the custom write_checkpoints event
event_definitions:
  write_checkpoints:
    payloads:
      #  This defines where the replicated Custom Write Checkpoints should be extracted from
      - SELECT user_id, checkpoint, client_id FROM checkpoints

# Define Sync Rules as usual
bucket_definitions:
  global:
    data:
    ...
```

### Application

Your application should handle Custom Write Checkpoints on both the frontend and backend.

#### Frontend

Your client backend connector should make a call to the application backend to create a Custom Write Checkpoint record after uploading items in the `uploadData` method. The Write Checkpoint number should be supplied to the CRUD transactions' `complete` method.

```TypeScript
 async function uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    // Get the unique client ID from the PowerSync Database SQLite storage
    const clientId = await db.getClientId();

      for (const operation of transaction.crud) {
        // Upload the items to application backend
        // ....
      }

      await transaction.complete(await getCheckpoint(clientId));
 }

 async function getCheckpoint(clientId: string): string {
  /**
   * Should perform a request to the application backend which should create the
   * Write Checkpoint record and return the corresponding checkpoint number.
   */
  return "the Write Checkpoint number from the request";
 }
```

#### Backend

The backend should create a Write Checkpoint record when the client requests it. The record should automatically increment the Write Checkpoint number for the associated `user_id` and `client_id`.

#### Postgres Example

With the following table defined in the database...

```SQL
CREATE TABLE checkpoints (
    user_id VARCHAR(255),
    client_id VARCHAR(255),
    checkpoint INTEGER,
    PRIMARY KEY (user_id, client_id)
);
```

...the backend should have a route which creates `checkpoints` records:

```TypeScript
router.put('/checkpoint', async (req, res) => {
  if (!req.body) {
    res.status(400).send({
      message: 'Invalid body provided'
    });
    return;
  }

  const client = await pool.connect();

// These could be obtained from the session
  const { user_id = 'UserID', client_id = '1' } = req.body;

  const response = await client.query(
    `
    INSERT
      INTO
        checkpoints
          (user_id, client_id, checkpoint)
      VALUES
          ($1, $2, '1')
    ON
      CONFLICT (user_id, client_id)
    DO
      UPDATE
        SET checkpoint = checkpoints.checkpoint + 1
    RETURNING checkpoint;
    `,
    [user_id, client_id]
  );
  client.release();

  // Return the Write Checkpoint number
  res.status(200).send({
    checkpoint: response.rows[0].checkpoint
  });
});

```

An example implementation can be seen in the [Node.js backend demo](https://github.com/powersync-ja/powersync-nodejs-backend-todolist-demo/blob/main/src/api/data.js), including examples for [MongoDB](https://github.com/powersync-ja/powersync-nodejs-backend-todolist-demo/blob/main/src/persistance/mongo/mongo-persistance.js) and [MySQL](https://github.com/powersync-ja/powersync-nodejs-backend-todolist-demo/blob/main/src/persistance/mysql/mysql-persistance.js).

# Data Encryption
Source: https://docs.powersync.com/usage/use-case-examples/data-encryption

### In Transit Encryption

Data is always encrypted in transit using TLS — both between the client and PowerSync, and between PowerSync [and the source database](/usage/lifecycle-maintenance/postgres-maintenance#tls).

### At Rest Encryption

The client-side database can be encrypted at rest using [SQLCipher](https://www.zetetic.net/sqlcipher/).

This is currently available for:

<Accordion title="Flutter" icon="flutter">
  SQLCipher support is available for Flutter through the `powersync_sqlcipher` SDK. See usage details in the package README:

  <Card title="powersync_sqlcipher" icon="flutter" href="https://pub.dev/packages/powersync_sqlcipher" horizontal />
</Accordion>

<Accordion title="React Native & Expo" icon="react">
  SQLCipher support is available for React Native through the `@powersync/op-sqlite` package. See usage details in the package README:

  <Card title="npm: @powersync/op-sqlite" icon="npm" href="https://www.npmjs.com/package/@powersync/op-sqlite" horizontal />
</Accordion>

Support for SQLCipher on other platforms is planned. In the meantime, let us know with your needs and use cases on [Discord](https://discord.gg/powersync).

### End-to-end Encryption

For end-to-end encryption, the encrypted data can be synced using PowerSync. The data can then either be encrypted and decrypted directly in memory by the application, or a separate local-only table can be used to persist the decrypted data — allowing querying the data directly.

An example implementation is coming soon.

## See Also

* Database Setup → [Security & IP Filtering](/installation/database-setup/security-and-ip-filtering)
* Resources → [Security](/resources/security)

# Full-Text Search
Source: https://docs.powersync.com/usage/use-case-examples/full-text-search

Client-side full-text search (FTS) is available using the [SQLite FTS5 extension](https://www.sqlite.org/fts5.html).

This requires creating a separate FTS5 table(s) to index the data, and updating the table(s) using SQLite triggers.

<Note>
  Note that the availability of FTS is dependent on the underlying `sqlite` package used, as it is an extension that must first be enabled in the package.
</Note>

Full-text search is currently available in the following client SDKs, and we plan to extend support to all SDKs in the near future:

* [**Flutter SDK**](/client-sdk-references/flutter): Uses the [sqlite\_async](https://pub.dev/documentation/sqlite_async/latest/) package for migrations
* [**JavaScript/Web SDK**](/client-sdk-references/javascript-web): Requires version 0.5.0 or greater (including [wa-sqlite](https://github.com/powersync-ja/wa-sqlite) 0.2.0+)
* [**React Native SDK**](/client-sdk-references/react-native-and-expo): Requires version 1.16.0 or greater (including [@powersync/react-native-quick-sqlite](https://github.com/powersync-ja/react-native-quick-sqlite) 2.2.1+)

## Example Implementations

FTS is implemented in the following demo apps:

* [Flutter To-Do List App](https://github.com/powersync-ja/powersync.dart/tree/master/demos/supabase-todolist)
* [React To-Do List App](https://github.com/powersync-ja/powersync-js/tree/main/demos/react-supabase-todolist)
* [React Native To-Do List App](https://github.com/powersync-ja/powersync-js/tree/main/demos/react-native-supabase-todolist)

We explain these implementations in more detail below. Example code is shown mainly in Dart, but references to the React or React Native equivalents are included where relevant, so you should be able to cross-reference.

## Walkthrough: Full-text search in the To-Do List Demo App

### Setup

FTS tables are created when instantiating the client-side PowerSync database (DB).

<Tabs>
  <Tab title="Dart">
    ```dart
    // https://github.com/powersync-ja/powersync.dart/blob/master/demos/supabase-todolist/lib/powersync.dart#L186

    Future<void> openDatabase() async {
      ...
      await configureFts(db);
    }
    ```
  </Tab>

  <Tab title="React">
    ```ts
    // https://github.com/powersync-ja/powersync-js/blob/main/demos/react-supabase-todolist/src/components/providers/SystemProvider.tsx#L41

    SystemProvider = ({ children }: { children: React.ReactNode }) => {
      ...
      React.useEffect(() => {
      ...
          configureFts();
      })
    }
    ```
  </Tab>

  <Tab title="React Native">
    ```ts
    // https://github.com/powersync-ja/powersync-js/blob/main/demos/react-native-supabase-todolist/library/powersync/system.ts#L75

    export class System {
      ...
      powersync: PowerSyncDatabase;
      ...
      async init() {
        ...
        await configureFts(this.powersync);
      }
    }
    ```
  </Tab>
</Tabs>

First, we need to set up the FTS tables to match the `lists` and `todos` tables already created in this demo app. Don't worry if you already have data in the tables, as it will be copied into the new FTS tables.

To simplify implementation these examples make use of SQLite migrations. The migrations are run in [migrations/fts\_setup.dart](https://github.com/powersync-ja/powersync.dart/blob/master/demos/supabase-todolist/lib/migrations/fts_setup.dart) in the Flutter implementation. Here we use the [sqlite\_async](https://pub.dev/documentation/sqlite_async/latest/) Dart package to generate the migrations.

<Note>
  Note: The Web and React Native implementations do not use migrations. It creates the FTS tables separately, see for example [utils/fts\_setup.ts](https://github.com/powersync-ja/powersync-js/blob/main/demos/react-supabase-todolist/src/app/utils/fts_setup.ts) (Web) and [library/fts/fts\_setup.ts](https://github.com/powersync-ja/powersync-js/blob/main/demos/react-native-supabase-todolist/library/fts/fts_setup.ts) (React Native).
</Note>

**Dart example:**

```dart
// migrations/fts_setup.dart

/// This is where you can add more migrations to generate FTS tables
/// that correspond to the tables in your schema and populate them
/// with the data you would like to search on
Future<void> configureFts(PowerSyncDatabase db) async {
  migrations
    ..add(createFtsMigration(
        migrationVersion: 1,
        tableName: 'lists',
        columns: ['name'],
        tokenizationMethod: 'porter unicode61'))
    ..add(createFtsMigration(
      migrationVersion: 2,
      tableName: 'todos',
      columns: ['description', 'list_id'],
    ));
  await migrations.migrate(db);
}
```

The `createFtsMigration` function is key and corresponds to the below (Dart example):

```dart
// migrations/fts_setup.dart

/// Create a Full Text Search table for the given table and columns
/// with an option to use a different tokenizer otherwise it defaults
/// to unicode61. It also creates the triggers that keep the FTS table
/// and the PowerSync table in sync.
SqliteMigration createFtsMigration(
    {required int migrationVersion,
    required String tableName,
    required List<String> columns,
    String tokenizationMethod = 'unicode61'}) {
  String internalName =
      schema.tables.firstWhere((table) => table.name == tableName).internalName;
  String stringColumns = columns.join(', ');

  return SqliteMigration(migrationVersion, (tx) async {
    // Add FTS table
    await tx.execute('''
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_$tableName
      USING fts5(id UNINDEXED, $stringColumns, tokenize='$tokenizationMethod');
    ''');
    // Copy over records already in table
    await tx.execute('''
      INSERT INTO fts_$tableName(rowid, id, $stringColumns)
      SELECT rowid, id, ${generateJsonExtracts(ExtractType.columnOnly, 'data', columns)}
      FROM $internalName;
    ''');
    // Add INSERT, UPDATE and DELETE and triggers to keep fts table in sync with table
    await tx.execute('''
      CREATE TRIGGER IF NOT EXISTS fts_insert_trigger_$tableName AFTER INSERT
      ON $internalName
      BEGIN
        INSERT INTO fts_$tableName(rowid, id, $stringColumns)
        VALUES (
          NEW.rowid,
          NEW.id,
          ${generateJsonExtracts(ExtractType.columnOnly, 'NEW.data', columns)}
        );
      END;
    ''');
    await tx.execute('''
      CREATE TRIGGER IF NOT EXISTS fts_update_trigger_$tableName AFTER UPDATE
      ON $internalName BEGIN
        UPDATE fts_$tableName
        SET ${generateJsonExtracts(ExtractType.columnInOperation, 'NEW.data', columns)}
        WHERE rowid = NEW.rowid;
      END;
    ''');
    await tx.execute('''
      CREATE TRIGGER IF NOT EXISTS fts_delete_trigger_$tableName AFTER DELETE
      ON $internalName BEGIN
        DELETE FROM fts_$tableName WHERE rowid = OLD.rowid;
      END;
    ''');
  });
}
```

After this is run, you should have the following tables and triggers in your SQLite DB:

<Frame caption="FTS tables and migrations">
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage-4.png" />
</Frame>

<Frame caption="FTS triggers">
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage-5.png" />
</Frame>

### FTS Search Delegate

To show off this new functionality, we have incorporated FTS into the search button at the top of the screen in the To-Do List demo app:

<Frame>
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage-6.avif" />
</Frame>

Clicking on the search icon will open a search bar which will allow you to search for `lists` or `todos` that you have generated.

<Frame caption="Example of searching">
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage-7.png" />
</Frame>

It uses a custom search delegate widget found in [widgets/fts\_search\_delegate.dart](https://github.com/powersync-ja/powersync.dart/blob/master/demos/supabase-todolist/lib/widgets/fts_search_delegate.dart) (Flutter) and [widgets/SearchBarWidget.tsx](https://github.com/powersync-ja/powersync-js/blob/main/demos/react-supabase-todolist/src/components/widgets/SearchBarWidget.tsx) (Web) to display the search results.

### FTS Helper

We added a helper in [lib/fts\_helpers.dart](https://github.com/powersync-ja/powersync.dart/blob/master/demos/supabase-todolist/lib/fts_helpers.dart) (Flutter) and [utils/fts\_helpers](https://github.com/powersync-ja/powersync-js/blob/main/demos/react-supabase-todolist/src/app/utils/fts_helpers.ts)[.ts](https://github.com/powersync-ja/powersync-js/blob/main/demos/react-supabase-todolist/src/app/utils/fts_helpers.ts) (Web) that allows you to add additional search functionality which can be found in the [SQLite FTS5 extension](https://www.sqlite.org/fts5.html) documentation.

**Dart example:**

```dart
// lib/fts_helpers.dart

String _createSearchTermWithOptions(String searchTerm) {
  // adding * to the end of the search term will match any word that starts with the search term
  // e.g. searching bl will match blue, black, etc.
  // consult FTS5 Full-text Query Syntax documentation for more options
  String searchTermWithOptions = '$searchTerm*';
  return searchTermWithOptions;
}

/// Search the FTS table for the given searchTerm and return results ordered by the
/// rank of their relevance
Future<List> search(String searchTerm, String tableName) async {
  String searchTermWithOptions = _createSearchTermWithOptions(searchTerm);
  return await db.execute(
      'SELECT * FROM fts_$tableName WHERE fts_$tableName MATCH ? ORDER BY rank',
      [searchTermWithOptions]);
}
```

# Infinite Scrolling
Source: https://docs.powersync.com/usage/use-case-examples/infinite-scrolling

Infinite scrolling is a software design technique that loads content continuously as the user scrolls down the page/screen.

There are a few ways to accomplish infinite scrolling with PowerSync, either by querying data from the local SQLite database, or by [lazy-loading](https://en.wikipedia.org/wiki/Lazy_loading) or lazy-syncing data from your backend.

Here is an overview of the different options with pros and cons:

### 1) Pre-sync all data and query the local database

PowerSync currently [performs well](/resources/performance-and-limits) with syncing up to 100,000 rows per client, with plans to scale to over 1,000,000 rows per client soon.

This means that in many cases, you can sync a sufficient amount of data to let a user keep scrolling a list or feed that basically feels "infinite" to them.

| Pros                                                                                                                                                                                                  | Cons                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| It works offline and is low-latency (data loads quickly from the local database). We don't need to load data from the backend via the network when the user reaches the bottom of the page/feed/list. | There will be cases where this approach won't work because the total volume of data might become too large for the local database, for example:There's a wide range of tables that the user needs to be able to infinite scrollYour app allows the user to apply filters to the displayed data, which results in fewer pages displayed from a large dataset, and therefore limited scrolling. |

### 2) Control data sync using client parameters

PowerSync supports the use of [client parameters](/usage/sync-rules/advanced-topics/client-parameters) which are specified directly by the client (i.e. not only through the [authentication token](/installation/authentication-setup/custom)). The app can dynamically change these parameters on the client-side and they can be accessed in sync rules on the server-side. The developer can use these parameters to limit/control which data is synced, but since they are not trusted (because they are not passed via the JWT authentication token) they should not be used for access control. You should still filter data by e.g. user ID for access control purposes (using [token parameters](/usage/sync-rules/parameter-queries) from the JWT).

Usage example: To lazy-load/lazy-sync data for infinite scrolling, you could split your data into 'pages' and use a client parameter to specify which pages to sync to a user.

| Pros                                                                                                            | Cons                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Does not require updating flags in your backend database. Enables client-side control over what data is synced. | We can only sync additional data when the user is online.There will be latency while the user waits for the additional data to sync. |

### 3) Sync limited data and then load more data from an API

In this scenario we can sync a smaller number of rows to the user initially. And then if the user reaches the end of the page/feed/list, we make an online API call to load additional data from the backend to display to the user.

| Pros                                                                                           | Cons                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| This requires syncing less data to each user, which will result in a faster initial sync time. | We can only load additional data when the user is online.There will be some latency to load the additional data (similar to a cloud-first app making API calls)In your app code, records loaded from the API will have to be treated differently from the records loaded from the local SQLite database. |

### 4) Client-side triggers a server-side function to flag data to sync

You could add a flag to certain records in your backend database which are used by your [Sync Rules](/usage/sync-rules) to determine which records to sync to specific users. Then your app could make an API call which triggers a function that updates the flags on certain records, causing more records to be synced to the user.

| Pros                                                                                           | Cons                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| This requires syncing less data to each user, which will result in a faster initial sync time. | We can only perform the trigger and sync additional data when the user is online.There will be higher latency: Both for the API call to update the flags, and for syncing the additional dataWe do not necessarily recommend going this route: There's higher latency and it's not a particularly elegant architecture. |

## Questions, Comments, Suggestions?

[Let us know on Discord](https://discord.gg/powersync).

# Local-only Usage
Source: https://docs.powersync.com/usage/use-case-examples/offline-only-usage

Some use cases require data persistence before the user has registered or signed in.

In some of those cases, the user may want to register and start syncing data with other devices or users at a later point, while other users may keep on using the app without ever registering or going online."

PowerSync supports these scenarios. By default, all local changes will be stored in the upload queue, and will be uploaded to the backend server if the user registers at a later point.

A caveat is that if the user never registers, this queue will keep on growing in size indefinitely. For many applications this should be small enough to not be significant, but some data-intensive applications may want to avoid the indefinite queue growth.

There are two general approaches we recommend for this:

### 1. Local-only tables

<Tabs>
  <Tab title="Flutter">
    ```dart
    final table = Table.localOnly(
      ...
    )
    ```
  </Tab>

  <Tab title="javaScript">
    ```js
    const lists = new Table({
      ...
    }, {
      localOnly: true
    });
    ```
  </Tab>

  <Tab title="Kotlin">
    ```kotlin
    val Table = Table(
        ...
        localOnly = true
    )
    ```
  </Tab>

  <Tab title="Swift">
    ```swift
    let table = Table(
        ...
        localOnly: true
    )
    ```
  </Tab>
</Tabs>

Use local-only tables until the user has registered or signed in. This would not store any data in the upload queue, avoiding any overhead or growth in database size.

Once the user registers, move the data over to synced tables, at which point the data would be placed in the upload queue.

The following example implementations are available:

| Client framework                       | Link                                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Flutter To-Do List App (with Supabase) | [supabase-todolist-optional-sync](https://github.com/powersync-ja/powersync.dart/tree/main/demos/supabase-todolist-optional-sync)           |
| React To-Do List App (with Supabase)   | [react-supabase-todolist-optional-sync](https://github.com/powersync-ja/powersync-js/tree/main/demos/react-supabase-todolist-optional-sync) |

### 2. Clearing the upload queue

The upload queue can be cleared periodically (for example on every app start-up), avoiding the growth in database size over time. This can be done using:

```sql
DELETE FROM ps_crud
```

It is up to the application to then re-create the queue when the user registers, or upload data directly from the existing tables instead.

A small amount of metadata per row is also stored in the `ps_oplog` table. We do not recommend deleting this data, as it can cause or hide consistency issues when later uploading the data. If the overhead in `ps_oplog` is too much, rather use the local-only tables approach.

# PostGIS
Source: https://docs.powersync.com/usage/use-case-examples/postgis

Custom types, arrays and [PostGIS](https://postgis.net/) are frequently presented together since geospatial data is often complex and multidimensional.

## Overview

It's therefore recommend to first quickly scan the content in [Custom Types, Arrays and JSON](/usage/use-case-examples/custom-types-arrays-and-json)

PowerSync integrates well with PostGIS and provides tools for working with geo data.

### PostGIS

In Supabase, the PostGIS extension needs to be added to your project to use this type. Run the following command in the SQL editor to include the PostGIS extension:

```sql
CREATE extension IF NOT EXISTS postgis;
```

The `geography` and `geometry` types are now available in your Postgres.

## Supabase Configuration Example:

This example builds on the To-Do List demo app in our [Supabase integration guide](/integration-guides/supabase-+-powersync).

### Add custom type, array and PostGIS columns to the `todos` table

```sql
--SQL command to update the todos table with 3 additional columns:

ALTER TABLE todos
ADD COLUMN address location_address null,
ADD COLUMN contact_numbers text [] null,
ADD COLUMN location geography (point) null
```

### Insert a row of data into the table

```sql
-- Grab the id of a list object and a user id and create a new todos
INSERT INTO public.todos(description, list_id, created_by, address, location, contact_numbers) VALUES ('Bread', 'list_id', 'user_id', '("1000 S Colorado Blvd.","Denver","CO",80211)', st_point(39.742043, -104.991531), '{000-000-0000, 000-000-0000, 000-000-0000}');
```

Note the following:

**Custom type**: Specify the value for the `address` column by wrapping the value in single quotes and comma separate the different location\_address properties.

* `'("1000 S Colorado Blvd.","Denver","CO",80211)'`

**Array**: Specify the value of the `contact_numbers` column, by surrounding the comma-separated array items in curly braces.

* `'{000-000-0000, 000-000-0000, 000-000-0000}'`

**PostGIS**: Specify the value of the `location` column by using the `st_point` function and pass in the latitude and longitude

* `st_point(39.742043, -104.991531)`

### What this data looks like when querying from the PowerSync Dashboard

These data types show up as follows when querying from the [PowerSync Dashboard](https://powersync.journeyapps.com/)'s SQL Query editor:

```sql
SELECT * from todos WHERE location IS NOT NULL
```

| location                                           |
| -------------------------------------------------- |
| 0101000020E6100000E59CD843FBDE4340E9818FC18AC052C0 |

This is Postgres' internal binary representation of the PostGIS type.

## On the Client

### AppSchema example

```js
export const AppSchema = new Schema([
  new Table({
    name: 'todos',
    columns: [
      new Column({ name: 'list_id', type: ColumnType.TEXT }),
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'completed_at', type: ColumnType.TEXT }),
      new Column({ name: 'description', type: ColumnType.TEXT }),
      new Column({ name: 'completed', type: ColumnType.INTEGER }),
      new Column({ name: 'created_by', type: ColumnType.TEXT }),
      new Column({ name: 'completed_by', type: ColumnType.TEXT }),
      new Column({name: 'address', type: ColumnType.TEXT}),
      new Column({name: 'contact_numbers', type: ColumnType.TEXT})
      new Column({name: 'location', type: ColumnType.TEXT}),
    ],
    indexes: [new Index({ name: 'list', columns: [new IndexedColumn({ name: 'list_id' })] })]
  }),
  new Table({
    name: 'lists',
    columns: [
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'name', type: ColumnType.TEXT }),
      new Column({ name: 'owner_id', type: ColumnType.TEXT })
    ]
  })
]);
```

Note:

* The custom type, array and PostGIS type have been defined as `TEXT` in the AppSchema. The Postgres PostGIS capabilities are not available because the PowerSync SDK uses SQLite, which only has a limited number of types. This means that everything is replicated into the SQLite database as TEXT values.
* Depending on your application, you may need to implement functions in the client to parse the values and then other functions to write them back to the Postgres database.

### What does the data look like in SQLite?

The data looks exactly how it’s stored in the Postgres database i.e.

1. **Custom Type**: It has the same format as if you inserted it using a SQL statement, i.e.
   1. `(1000 S Colorado Blvd.,Denver,CO,80211)`
2. **Array**: Array types act similar in that it shows the data in the same way it was inserted e.g
   1. `{000-000-0000, 000-000-0000, 000-000-0000}`
3. **PostGIS**: The `geography` type is transformed into an encoded form of the value.
   1. If you insert coordinates as `st_point(39.742043, -104.991531)` then it is shown as `0101000020E6100000E59CD843FBDE4340E9818FC18AC052C0`

## Sync Rules

### PostGIS

Example use case: Extract x (long) and y (lat) values from a PostGIS type, to use these values independently in an application.

Currently, PowerSync supports the following functions that can be used when selecting data in your sync rules: [Operators and Functions](/usage/sync-rules/operators-and-functions)

1. `ST_AsGeoJSON`
2. `ST_AsText`
3. `ST_X`
4. `ST_Y`

<Note>
  IMPORTANT NOTE: These functions will only work if your Postgres instance has the PostGIS extension installed and you’re storing values as type `geography` or `geometry`.
</Note>

```yaml
# sync-rules.yaml
bucket_definitions:
  global:
    data:
      - SELECT * FROM lists
      - SELECT *, st_x(location) as longitude, st_y(location) as latitude from todos
```

# Prioritized Sync
Source: https://docs.powersync.com/usage/use-case-examples/prioritized-sync

In some scenarios, you may want to sync tables using different priorities. For example, you may want to sync a subset of all tables first to log a user in as fast as possible, then sync the remaining tables in the background.

<Info>
  Note that this strategy is specifically to prioritize data on initial sync, and cannot be used for incremental sync after that.
</Info>

## Overview

The general approach is as follows:

1. Define how many priority types you want - typically only two are needed: "high priority" and "the rest"

2. Create a sync bucket for each priority type

3. Use [client parameters](/usage/sync-rules/advanced-topics/client-parameters) to control which priorities you want the client to sync

## Example

Suppose we have two tables: `lists` and `todos` (as per the standard todolist demo app [schema](/integration-guides/supabase-+-powersync#create-the-demo-database-schema)). Further, suppose we want the sync priority to behave as follows:

1. First, sync all the user's lists, enabling us to render the initial screen in the app

2. Then, sync the user's todos

Below are the sync rules that will enable this:

```yaml
bucket_definitions:
  # always sync high priority tables (first), in this case the user's lists
  high_priority:
    parameters: select id as list_id from lists where owner_id = token_parameters.user_id
    data:
        - select * from lists where id = bucket.list_id
  # sync any remaining tables, in this case todo items
  remaining:
    parameters: select id as list_id from lists where owner_id = token_parameters.user_id and (request.parameters() ->> 'remaining_tables' = true)
    data:
        - select * from todos where list_id = bucket.list_id
```

It is recommended to set Client Parameters in the [Diagnostics App](https://github.com/powersync-ja/powersync-js/tree/main/tools/diagnostics-app) to verify functionality at this point:

<Frame>
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/powersync/images/usage/use-case-prioritized.png" />
</Frame>

If everything checks out, you can then proceed to implement the client parameter switching accordingly in your app.
