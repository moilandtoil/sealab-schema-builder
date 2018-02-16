"use strict";

const _ = require("lodash");
const SchemaBuilderItem = require("./schema_builder_item.js");

class SchemaBuilder {
  constructor() {
    this.entrypoints = ['query', 'mutation', 'subscription'];
    this.resolvers = {};
    this.typeDefs = {
      null: []
    };
    this.guards = [];
    this.guardInstances = {};
  }

  registerGuards(guards) {
    if (!_.isArray(guards)) {
      guards = [guards];
    }
    for (let guard of guards) {
      this.guards.push(guard);

      let instance = new guard();
      this.guardInstances[instance.id()] = instance;
    }
  }

  getGuardInstance(guardId) {
    if (this.guardInstances[guardId] === undefined) {
      throw new Error(`Guard (${guardId}) not found`);
    }
    return this.guardInstances[guardId];
  }

  getGuardInstances() {
    return this.guardInstances;
  }

  getGuardIds() {
    return Object.keys(this.getGuardInstances());
  }

  getGuards() {
    return this.guards;
  }

  validateGuards(guardIds, context) {
    for (let guardId of guardIds) {
      let guard = this.getGuardInstance(guardId);
      if (!guard.validate(context)) {
        return false;
      }
    }
    return true;
  }

  addTypeDef(typeDef, guards = [], group = null) {
    if (!this.typeDefs.hasOwnProperty(group)) {
      this.typeDefs[group] = [];
    }

    if ([].concat([null], this.entrypoints).indexOf(group) === -1) {
      throw new Error(`Invalid group "${group}" specified`);
    }

    this.typeDefs[group].push(new SchemaBuilderItem(typeDef, guards));
  }

  addTypeDefs(typeDefs) {
    for (let typeDef of typeDefs) {
      this.addTypeDef(typeDef.definition, typeDef.group, typeDef.guards);
    }
  }

  addTypeResolver(resolverName, resolverDef, guards = []) {
    this.addResolver(resolverName, resolverDef, null, guards)
  }

  addTypeResolvers(resolvers) {
    for (let resolverName in resolvers) {
      if (!resolvers.hasOwnProperty(resolverName)) {
        continue;
      }

      this.addTypeResolver(resolverName, resolvers[resolverName].definition, resolvers[resolverName].guards);
    }
  }

  addResolver(resolverName, resolverDef, group, guards = []) {
    if (!this.resolvers.hasOwnProperty(group)) {
      this.resolvers[group] = {};
    }

    if ([].concat([null], this.entrypoints).indexOf(group) === -1) {
      throw new Error(`Invalid group "${group}" specified`);
    }

    if (this.resolvers[group][resolverName] !== undefined) {
      throw new Error(`Type ${resolverName} already defined`);
    }

    this.resolvers[group][resolverName] = new SchemaBuilderItem(resolverDef, guards);
  }

  addResolvers(resolvers) {
    for (let resolverName in resolvers) {
      if (!resolvers.hasOwnProperty(resolverName)) {
        continue;
      }

      this.addResolver(resolverName, resolvers[resolverName].definition, resolvers[resolverName].group, resolvers[resolverName].guards);
    }
  }

  addType(name, typeDef, resolver, guards = []) {
    return this.addEntrypoint(name, null, typeDef, resolver, guards);
  }

  addEntrypoint(name, group, typeDef, resolver, guards = []) {
    this.addTypeDef(typeDef, guards, group);
    this.addResolver(name, resolver, group, guards);
  }

  generateTypeDefs(context, guardWhitelist = null) {
    if (guardWhitelist === null) {
      guardWhitelist = this.getGuardIds();
    }
    let typeDefs = [];

    for (let typeDef of this.typeDefs[null]) {
      if (!this.validateGuards(typeDef.guards, context)) {
        continue;
      }
      typeDefs.push(typeDef.definition);
    }

    for (let group of this.entrypoints) {
      if (this.typeDefs[group] === undefined || this.typeDefs[group].length === 0) {
        continue;
      }

      let groupTypeDefs = [];

      for (let typeDef of this.typeDefs[group]) {
        if (!this.validateGuards(_.intersection(typeDef.guards, guardWhitelist), context)) {
          continue;
        }
        groupTypeDefs.push(typeDef.definition);
      }

      typeDefs.push(
        `
          type ${_.startCase(group)} {
            ${groupTypeDefs.join("\n")}
          }
        `
      )
    }

    return typeDefs.join("\n");
  }

  generateResolvers(context, guardWhitelist = null) {
    if (guardWhitelist === null) {
      guardWhitelist = this.getGuardIds();
    }

    let resolvers = {};

    if (this.resolvers[null] !== undefined) {
      for (let name in this.resolvers[null]) {
        if (!this.resolvers[null].hasOwnProperty(name)) {
          continue;
        }

        let resolver = this.resolvers[null][name];

        if (!this.validateGuards(resolver.guards, context)) {
          continue;
        }
        resolvers[name] = resolver.definition;
      }
    }

    for (let group of this.entrypoints) {
      if (this.resolvers[group] === undefined || this.resolvers[group].length === 0) {
        continue;
      }

      let groupTypes = {};

      for (let name in this.resolvers[group]) {
        if (!this.resolvers[group].hasOwnProperty(name)) {
          continue;
        }

        let resolver = this.resolvers[group][name];

        if (!this.validateGuards(_.intersection(resolver.guards, guardWhitelist), context)) {
          continue;
        }

        groupTypes[name] = resolver.definition;
      }

      resolvers[_.startCase(group)] = groupTypes;
    }

    return resolvers;
  }
}

SchemaBuilder.ENTRYPOINT_QUEYR = "query";
SchemaBuilder.ENTRYPOINT_MUTATION = "mutation";
SchemaBuilder.ENTRYPOINT_SUBSCRIPTION = "subscription";

module.exports = SchemaBuilder;