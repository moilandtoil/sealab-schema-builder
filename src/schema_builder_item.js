"use strict";

class SchemaBuilderItem {
  constructor(definition, guards = []) {
    this.definition = definition;
    this.guards = guards;
  }
}

module.exports = SchemaBuilderItem;