# Overview
The schema builder is a library for the programmatic creation of GraphQL typeDef and resolvers.
This allows for typeDefs and resolvers to be organized within multiple files, functions, classes, etc and compiled together at runtime.

In addition it exposes an authorization construct referred to as `guards`.
Guards are basically simple conditional structures, where the GraphQL context is passed in and a user define check is performed.
Using guards, a schema can be generated specific to a context.
This allows limiting the introspection to only what a context is authorized to consume.  Ie, if an application has a set of admin specific entrypoints, these can be hidden from non admin users.

# TODO
- Add multi-file example that better demonstrate the use case the library was designed for

# API

## SchemaBuilderGuard

Guards are simply the implementation of the abstract Guard class.  `SchemaBuilderGuard` is an abstract class that is extended to implmeent custom guards.
It expects the `id` and `validate` functions to be overridden

### id()
Return a string containing the guard id

### validate(context)
Return a boolean depending on whether the context meets the guards condition.
Context is specific to the application, the base guard is agnostic of the context

#### Examples
Assuming a context with a structure as described below

```
{
  authToken: String | null
  user: {
    id: String | Null
    email: String | Null
    isAdmin: Boolean
  }
}
```

One could define a guard checking if a user is authenticated with

```
class Authenticated extends Guard {
  id() {
    return "authenticated"
  }

  validate(context) {
    return (context.authToken !== null);
  }
}
```

And define a guard to check if a user is an admin with

```
class IsAdmin extends Guard {
  id() {
    return "is_admin"
  }

  validate(context) {
    return (context.user && context.user.isAdmin);
  }
}
```

## SchemaBuilder

### registerGuards(guards)
`guards` can be either a single guard class, or an array of guard classes.
Each guard will instantiated and mapped using its implemented `#id()` function

### getGuardInstance(guardId)
`guardId` is a string that should match the return value of a registered guards `#id()` function

### getGuardInstances()
returns an object containing a `id: class Instance` mapping of all registered guards

### getGuardIds
returns an array of registered guard ids

### getGuards
returns an array of guard classes

### validateGuards(guardIds, context)
returns a boolean if all guard validations return true for a given context

`guardIds` is an array of guard ids to validate.

`context` a user defined GraphQL context object.

### addTypeDef(typeDef, \[guards = \[\]\], \[group = null\]
Adds a single typeDef to the schema builder. Any guards passed are associated with the typDef when generating the full list


`typeDef` a string containing the typeDef

`guards` an array of guard ids to associate with the typeDef

`group` Denotes a typeDef as an entrypoint type of data type. Valid group options are `query`, `mutation`, `subscription`, or `null`.
A null tells the builder the typeDef is a top level datatype.  If it is one of the other options it will nest the typeDef in the corresponding entrypoint schemas

### addTypeResolver(resolverName, resolverDef, \[guards = \[\]\])
Adds a single resolver to the schema builder for a top level typeDef


`resolverName` is a string that should match to a typeDef type name.  ie., if you have a typeDef of `type Foo { id: String }`, `resolverName` should be `Foo`

`resolverDef` is a resolver object for a typeDef. ie., if you have a typeDef of `type Foo { id: String }`, `resolverDef` could be `{ id: function(value) { return value.id } }`

`guards` is an optional array of guard ids.  The guards must have already been registered

### addResolver(resolverName, resolverDef, \[guards = \[\]\])
Adds a single resolver to the schema builder for a specific group


`resolverName` is a string that should make to a typeDef type name.  ie., if you have a typeDef of `type Foo { id: String }`, `resolverName` should be `Foo`

`resolverDef` is a resolver object for a typeDef. ie., if you have a typeDef of `type Foo { id: String }`, `resolverDef` could be `{ id: function(value) { return value.id } }`

`group` Denotes a resolver as an entrypoint resolver of data type resolver. Valid group options are `query`, `mutation`, `subscription`, or `null`.
        A null tells the builder the resolver is for a top level data type.  If it is one of the other options it will nest the resolver in the corresponding entrypoint object

`guards` an optional array of guard ids.  The guards must have already been registered


### addType(name, typeDef, resolverDef, \[guards = \[\]\])
Adds a data type with the typeDef and resolver.

`name` is a string that should make to a typeDef type name.  ie., if you have a typeDef of `type Foo { id: String }`, `name` should be `Foo`

`typeDef` a string containing the GraphQL typeDef

`resolverDef` is a resolver object for a typeDef. ie., if you have a typeDef of `type Foo { id: String }`, `resolverDef` could be `{ id: function(value) { return value.id } }`

`guards` an optional array of guard ids.  The guards must have already been registered


### addEntrypoint(name, group, typeDef, resolver, \[guards = \[\]\])
Adds the typeDef and resolver for an entrypoint all at once.  This is the perferred method for adding entrypoints as ensure consistency.

`name` is a string that should match to a typeDef type name.  ie., if you have a typeDef of `type Foo { id: String }`, `name` should be `Foo`

`group` the entrypoint group, one of `query`, `mutation`, or `subscription`

`typeDef` the GraphQL typeDef for the entrypoint

`resolver` the resolver object containing functions that map to the typeDef

`guards` an optional array of guard ids.  The guards must have already been registered

## genearteTypeDefs(context, guardWhitelist = null)
Generates an array of typeDefs from all the registered typeDefs in the schema builder. A guardWhitelist can be specified to only check specific guards.
Any associated guard of a typeDef that is checked and returns `false` will result in the typeDef being omitted from the generated schema

`context` A user defined GraphQL context to validate against the guards

`guardWhitelist` An array of guard ids.  If omitted will result in all registered guards being whitelisted.

When generating a schema, the intersection of guards associated with a typeDef and whitelistGuards are validated, all validations must return `true` for the typeDef to be included in the final generated array.

## generateResolvers(context, guardWhitelist = null)
Generates an object of resolvers from all the registered resolvers in the schema builder,
A guardWhitelist can be specified to only check specific guards.
Any associated guard of a resolver that is checked and returns `false` will result in the resolver being omitted from the generated schema

`context` A user defined GraphQL context to validate against the guards

`guardWhitelist` An array of guard ids.  If omitted will result in all registered guards being whitelisted.

When generating a schema, the intersection of guards associated with a resolver and whitelistGuards are validated, all validations must return `true` for the resolver to be included in the final generated object.

# Example

```

// Common way of manually creating a schema
const typeDefs = `
    type User {
      id: ID!
      name: String
    }

    type Post {
      id: ID!
      title: String
      author: User
    }

    # query entrypoints
    type Query {
      posts: [Post]
    }

    # mutation entrypoints
    type Mutation {
      addPost (
        postId: ID!
        title: String!
      ): Post
    }

    schema {
      query: Query
      mutation: Mutation
    }
`;


const resolvers = {
  Query: {
    posts() {
      return posts;
    },
  },
  Mutation: {
    addPost(rootValue, args, context) {
      // ... code to insert post into database
      // Post = insert_into_db(args, context);
      return {
        id: Post.id,
        title: Post.title,
        author: Post.author
      }
    },
  },
  User: {
    id(value) {
      return value.id
    },
    name(value) {
      return value.name
    }
  },
  Post: {
    id(value) {
      return value.id
    },
    title(value) {
      return value.title
    }
    author(value) {
      return value.author;
    }
  },
};


// Creating schemas using the query builder
const { SchemaBuilder, Guard } = require("sealab-schema-builder");

class LoggedIn extends Guards {
  id() {
    return "logged_in";
  }

  validate(context) {
    return context.token !== null;
  }
}

const builder = new SchemaBuilder();

# register guards
builder.registerGuards(LoggedIn);

# add typeDefs
builder.addTypeDef(`type User {
  id: ID!
  name: String
}`);
builder.addTypeDef(`type Post {
  id: ID!
  title: String
  author: User
}`);
builder.addTypeDef(`type Query {
  posts: [Post]
}`);
builder.addTypeDef(`type Mutation {
  addPost (
    postId: ID!
    title: String!
  ): Post
}`);
builder.addTypeDef(`schema {
  query: Query
  mutation: Mutation
}`);

# addResolvers
builder.addTypeResolver("User", {
  id(value) {
    return value.id
  },
  name(value) {
    return value.name
  }
});

builder.addTypeResolver("Post", {
  id(value) {
    return value.id
  },
  title(value) {
    return value.title
  }
  author(value) {
    return value.author;
  }
});

builder.addResolver("posts", function() {
  // database call to get a list of posts
  // posts = get_posts_from_db()
  return posts
}, "query");

builder.addResolver("posts", function(rootValue, args, context) {
  // ... code to insert post into database
  // Post = insert_into_db(args, context);
  return {
    id: Post.id,
    title: Post.title,
    author: Post.author
  }
}, "mutation");

const context = {
  // assume we have some function defined to get token from header and validate it
  token: get_token_from_header()
}

const typeDefs = builder.generateTypeDefs(context);
const resolvers = builder.generateResolvers(context);

```

# Testing
Run `npm run test`

# License
MIT