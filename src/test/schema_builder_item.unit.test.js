"use strict";

const SchemaBuilderItem = require("../schema_builder_item.js");

describe("When instantiating BuilderItem ", () => {

  test("and passing definition and guards", () => {
    let item = new SchemaBuilderItem("test", ["foo"]);

    expect(item.definition).toEqual("test");
    expect(item.guards.length).toEqual(1);
  });

  test("and pass definition and empty guards", () => {
    let item = new SchemaBuilderItem("test", []);

    expect(item.definition).toEqual("test");
    expect(item.guards.length).toEqual(0);
  });

  test("and not passing anything", () => {
    let item =new SchemaBuilderItem();

    expect(item.definition).toEqual(undefined);
    expect(item.guards.length).toEqual(0);
  });

});