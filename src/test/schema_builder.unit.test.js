"use strict";

const SchemaBuilder = require("../schema_builder.js");
const SchemaBuilderGuard = require("../schema_builder_guard.js");
const { makeExecutableSchema } = require("graphql-tools");
const { GraphQLSchema } = require("graphql");

class TestGuard extends SchemaBuilderGuard {
  id() {
    return "test_guard";
  }

  validate(context) {
    return context.foo === "bar";
  }
}

class OtherGuard extends SchemaBuilderGuard {
  id() {
    return "other_guard";
  }

  validate(context) {
    return context.other === "derp";
  }
}

String.prototype.removeWhitespace = function() {
  return this.replace(/\n/g, '').replace(/\s/g, '');
};

// TODO: Add tests for
// generate*() function guardWhitelists
// addTypeDefs()
// addTypeResolvers()
// getResolver()
// getGuards()
// getGuardInstances()
//

describe("Testing schema builder", () => {

  describe("when generating schemas", () => {

    let builder = null;
    beforeEach(() => {
      builder = new SchemaBuilder();
    });

    test("with no schemas added", () => {
      expect(builder.generateTypeDefs({}).removeWhitespace()).toEqual("");
    });

    test("with a schema added with #addTypeDef()", () => {
      builder.addTypeDef("type Foo { id: ID }");
      expect(builder.generateTypeDefs({}).removeWhitespace()).toEqual("typeFoo{id:ID}");
    });

    test("with a schema added with #addEntrypoint()", () => {
      builder.addEntrypoint("test", "query", "Test(id: ID): String", { id: function(value) { return value.id }});
      expect(builder.generateTypeDefs({}).removeWhitespace()).toEqual("typeQuery{Test(id:ID):String}");
    });

    test("with a schema added with #addTypeDef() & #addEntrypoint()", () => {
      builder.addTypeDef("type Foo { id: ID }");
      builder.addEntrypoint("test", "query", "Test(id: ID): String", { id: function(value) { return value.id }});
      expect(builder.generateTypeDefs({}).removeWhitespace()).toEqual("typeFoo{id:ID}typeQuery{Test(id:ID):String}");
    });
  });

  describe("when generating resolvers", () => {

    let builder = null;
    beforeEach(() => {
      builder = new SchemaBuilder();
    });

    test("with no schemas added", () => {
      expect(builder.generateResolvers({})).toEqual({});
    });

    test("with a schema added with #addTypeResolver()", () => {
      builder.addTypeResolver('Foo', { id: function(value) { return value.id } });

      let resolvers = builder.generateResolvers({});
      expect(resolvers.Foo.id({id: "bar"})).toEqual("bar");
    });

    test("with a schema added with #addEntrypoint()", () => {
      builder.addEntrypoint("Test", "query", "Test(id: ID): String", { id: function(value) { return value.id }});

      let resolvers = builder.generateResolvers({});
      expect(resolvers.Query.Test.id({id: "derp"})).toEqual("derp");
    });

    test("with a schema added with #addTypeResolver() & #addEntrypoint()", () => {
      builder.addTypeResolver('Foo', { id: function(value) { return value.id } });
      builder.addEntrypoint("Test", "query", "Test(id: ID): String", { id: function(value) { return value.id }});

      let resolvers = builder.generateResolvers({});
      expect(resolvers.Foo.id({id: "bar"})).toEqual("bar");
      expect(resolvers.Query.Test.id({id: "derp"})).toEqual("derp");
    });
  });

  describe("when adding guards to builder", () => {

    let builder = null;
    beforeEach(() => {
      builder = new SchemaBuilder();
    });

    test("with no guards added", () => {
      expect(builder.getGuards().length).toEqual(0);
    });

    test("with one guard added", () => {
      builder.registerGuards([TestGuard]);
      expect(builder.getGuards().length).toEqual(1);
    });

    test("with multiple guards added", () => {
      builder.registerGuards([TestGuard, OtherGuard]);
      expect(builder.getGuards().length).toEqual(2);
    });
  });


  describe("when generating schemas with guards", () => {

    let builder = null;
    beforeEach(() => {
      builder = new SchemaBuilder();
      builder.registerGuards([TestGuard, OtherGuard]);
    });

    // single guard check on null group
    test("with a schema added with #addTypeDef(), guard match", () => {
      builder.addTypeDef("type Foo { id: ID }", ['test_guard']);
      expect(builder.generateTypeDefs({ foo: "bar" }).removeWhitespace()).toEqual("typeFoo{id:ID}");
    });

    test("with a schema added with #addTypeDef(), guard mismatch", () => {
      builder.addTypeDef("type Foo { id: ID }", ['test_guard']);
      expect(builder.generateTypeDefs({ foo: "derp" }).removeWhitespace()).toEqual("");
    });

    // single guard check on non null group
    test("with a schema added with #addTypeDef(), guard match", () => {
      builder.addTypeDef("type Foo { id: ID }", ['test_guard']);
      expect(builder.generateTypeDefs({ foo: "bar" }).removeWhitespace()).toEqual("typeFoo{id:ID}");
    });

    test("with a schema added with #addTypeDef(), guard mismatch", () => {
      builder.addTypeDef("type Foo { id: ID }", ['test_guard']);
      expect(builder.generateTypeDefs({ foo: "derp" }).removeWhitespace()).toEqual("");
    });

    // multi guard check
    test("with a schema added with #addTypeDef(), guard match", () => {
      builder.addTypeDef("type Foo { id: ID }", ['test_guard', 'other_guard']);
      expect(builder.generateTypeDefs({ foo: "bar", other: "derp" }).removeWhitespace()).toEqual("typeFoo{id:ID}");
    });

    test("with a schema added with #addTypeDef(), guard mismatch", () => {
      builder.addTypeDef("type Foo { id: ID }", ['test_guard', 'other_guard']);
      expect(builder.generateTypeDefs({ foo: "derp" }).removeWhitespace()).toEqual("");
    });
  });

  describe("when generating resolvers with guards", () => {

    let builder = null;
    beforeEach(() => {
      builder = new SchemaBuilder();
      builder.registerGuards([TestGuard, OtherGuard]);
    });

    // single guard check on null group
    test("with a type added with #addTypeResolver(), guard match", () => {
      builder.addTypeResolver('Foo', { id: function(value) { return value.id } }, ['test_guard']);

      let resolvers = builder.generateResolvers({ foo: "bar" });
      expect(resolvers.Foo.id({id: "bar"})).toEqual("bar");
    });

    test("with a type added with #addTypeResolver(), guard mismatch", () => {
      builder.addTypeResolver('Foo', { id: function(value) { return value.id } }, ['test_guard']);

      let resolvers = builder.generateResolvers({ foo: "derp" });
      expect(Object.keys(resolvers).length).toEqual(0);
    });

    // single guard check on non null group
    test("with a type added with #addResolver(), guard match", () => {
      builder.addResolver('Foo', { id: function(value) { return value.id } }, "query", ['test_guard']);

      let resolvers = builder.generateResolvers({ foo: "bar" });
      expect(resolvers.Query.Foo.id({id: "bar"})).toEqual("bar");
    });

    test("with a type added with #addResolver(), guard mismatch", () => {
      builder.addResolver('Foo', { id: function(value) { return value.id } }, "query", ['test_guard']);

      let resolvers = builder.generateResolvers({ foo: "derp" });
      expect(Object.keys(resolvers.Query).length).toEqual(0);
    });

    // multi guard check
    test("with a type added with #addResolver(), multi guard match", () => {
      builder.addResolver('Foo', { id: function(value) { return value.id } }, "query", ['test_guard', 'other_guard']);

      let resolvers = builder.generateResolvers({ foo: "bar", other: "derp" });
      expect(resolvers.Query.Foo.id({id: "bar"})).toEqual("bar");
    });

    test("with a type added with #addResolver(), multi guard mismatch", () => {
      builder.addResolver('Foo', { id: function(value) { return value.id } }, "query", ['test_guard', 'other_guard']);

      let resolvers = builder.generateResolvers({ foo: "derp" });
      expect(Object.keys(resolvers.Query).length).toEqual(0);
    });
  });

  describe("when generating schema and resolvers", () => {

    test("makeExecutableSchema should return valid schema", () => {
      let builder = new SchemaBuilder();

      builder.addTypeResolver('Foo', { id: function(value) { return value.id } });
      builder.addTypeDef("type Foo { id: ID }");
      builder.addEntrypoint("test", "query", "test(id: ID): String", { id: function(value) { return value.id }});

      let typeDefs = builder.generateTypeDefs({});
      let resolvers = builder.generateResolvers({ foo: "bar" });

      let execSchema = makeExecutableSchema({
        typeDefs,
        resolvers
      });

      expect(execSchema).toBeInstanceOf(GraphQLSchema);
    });
  });
});