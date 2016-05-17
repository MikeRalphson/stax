'use strict';

var util = require('util');
var debuglog = util.debuglog('jgexml');

var target; // for new properties
var attributePrefix = '@';
var laxURIs = false;

function reset(attrPrefix,laxURIprocessing) {
	target = null;
	attributePrefix = attrPrefix;
	laxURIs = laxURIprocessing;
}

function clone(obj) {
	 return JSON.parse(JSON.stringify(obj));
}

function hoik(obj,target,key,newKey) {
	if (target && obj && (typeof obj[key] != 'undefined')) {
		if (!newKey) {
			newKey = key;
		}
		target[newKey] = clone(obj[key]);
		delete obj[key];
	}
}

function rename(obj,key,newName) {
	obj[newName] = obj[key];
	delete obj[key];
}

function isEmpty(obj) {
	if (typeof obj !== 'object') return false;
    for (var prop in obj) {
        if ((obj.hasOwnProperty(prop) && (typeof obj[prop] !== 'undefined'))) {
			return false;
		}
    }
 	return true;
}

function toArray(item) {
	if (!(item instanceof Array)) {
		var newitem = [];
		if (item) {
			newitem.push(item);
		}
		return newitem;
	}
	else {
		return item;
	}
}

function mandate(target,name) {
	if (!target.required) target.required = [];
	if (target.required.indexOf(name) < 0) {
		target.required.push(name);
	}
}

function mapType(type) {

	var result = {};
	result.type = type;

	if (type == 'xs:integer') {
		result.type = 'integer';
	}
	else if (type == 'xs:positiveInteger') {
		result.type = 'integer';
		result.minimum = 1;
	}
	else if (type == 'xs:nonPositiveInteger') {
		result.type = 'integer';
		result.maximum = 0;
	}
	else if (type == 'xs:negativeInteger') {
		result.type = 'integer';
		result.maximum = -1;
	}
	else if (type == 'xs:nonNegativeInteger') {
		result.type = 'integer';
		result.minimum = 0;
	}
	else if ((type == 'xs:unsignedInt') || (type == 'xs:unsignedShort') || (type == 'xs:unsignedByte')) {
		result.type = 'integer';
		result.format = 'int32';
		result.minimum = 0;
	}
	else if ((type == 'xs:int') || (type == 'xs:short') || (type == 'xs:byte')) {
		result.type = 'integer';
		result.format = 'int32';
	}
	else if (type == 'xs:long') {
		result.type = 'integer';
		result.format = 'int64';
	}
	else if (type == 'xs:unsignedLong') {
		result.type = 'integer';
		result.format = 'int64';
		result.minimum = 0;
	}

	if (type == 'xs:string') result.type = 'string';
	if (type == 'xs:NMTOKEN') result.type = 'string';
	if (type == 'xs:NMTOKENS') result.type = 'string';
	if (type == 'xs:ENTITY') result.type = 'string';
	if (type == 'xs:ENTITIES') result.type = 'string';
	if (type == 'xs:ID') result.type = 'string';
	if (type == 'xs:IDREF') result.type = 'string';
	if (type == 'xs:IDREFS') result.type = 'string';
	if (type == 'xs:NOTATION') result.type = 'string';
	if (type == 'xs:token') result.type = 'string';
	if (type == 'xs:Name') result.type = 'string';
	if (type == 'xs:NCName') result.type = 'string';
	if (type == 'xs:QName') result.type = 'string';
	if (type == 'xs:normalizedString') result.type = 'string';
	if (type == 'xs:base64Binary') {
		result.type = 'string';
		result.format = 'byte';
	}
	if (type == 'xs:hexBinary') {
		result.type = 'string';
		result.format = '^[0-9,a-f,A-F]*';
	}

	if (type == 'xs:boolean') result.type = 'boolean';

	if (type == 'xs:date') {
		result.type = 'string';
		result.pattern = '^[0-9]{4}\-[0-9]{2}\-[0-9]{2}.*$'; //timezones
	}
	else if (type == 'xs:dateTime') {
		result.type = 'string';
		result.format = 'date-time';
	}
	else if (type == 'xs:time') {
		result.type = 'string';
		result.pattern = '^[0-9]{2}\:[0-9]{2}:[0-9]{2}.*$'; // timezones
	}
	else if (type == 'xs:duration') {
		result.type = 'string';
		result.pattern = '^(-)?P(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)W)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?$';
	}
	else if (type == 'xs:gDay') {
		result.type = 'string';
		result.pattern = '[0-9]{2}';
	}
	else if (type == 'xs:gMonth') {
		result.type = 'string';
		result.pattern = '[0-9]{2}';
	}
	else if (type == 'xs:gMonthDay') {
		result.type = 'string';
		result.pattern = '[0-9]{2}\-[0-9]{2}';
	}
	else if (type == 'xs:gYear') {
		result.type = 'string';
		result.pattern = '[0-9]{4}';
	}
	else if (type == 'xs:gYearMonth') {
		result.type = 'string';
		result.pattern = '[0-9]{4}\-[0-9]{2}';
	}

	if (type == 'xs:language') {
		result.type = 'string';
		result.pattern = '[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*';
	}

	if (type == 'xs:decimal') {
		result.type = 'number';
	}
	else if (type == 'xs:double') {
		result.type = 'number';
		result.format = 'double';
	}
	else if (type == 'xs:float') {
		result.type = 'number';
		result.format = 'float';
	}

	if (type == 'xs:anyURI') {
		result.type = 'string';
		if (!laxURIs) {
			result.format = 'uri'; //XSD allows relative URIs, it seems JSON schema uri format may not?
			// this regex breaks swagger validators
			//result.pattern = '^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?';
		}
	}

	return result;
}

function doElement(src,parent,key) {
	var type = 'object';
	var name;

	var simpleType;

	var element = src[key];
	if ((typeof element == 'undefined') || (null === element)) {
		return false;
	}

	if (element["@name"]) {
		name = element["@name"];
	}
	if (element["@type"]) {
		type = element["@type"];
	}
	else if ((element["@name"]) && (element["xs:simpleType"])) {
		type = element["xs:simpleType"]["xs:restriction"]["@base"];
		simpleType = element["xs:simpleType"]["xs:restriction"];
	}
	else if ((element["@name"]) && (element["xs:restriction"])) {
		type = element["xs:restriction"]["@base"];
		simpleType = element["xs:restriction"];
	}
	else if (element["@ref"]) {
		name = element["@ref"];
		type = element["@ref"];
	}

	if (name && type) {
		//console.log(name+' = '+type);
		var isAttribute = (element["@isAttr"] == true);

		if (!target) target = parent;
		if (!target.properties) target.properties = {};
		var newTarget = target;

		var minOccurs = 1;
		var maxOccurs = 1;
		if (element["@minOccurs"]) minOccurs = parseInt(element["@minOccurs"],10);
		if (element["@maxOccurs"]) maxOccurs = element["@maxOccurs"];
		if (maxOccurs == 'unbounded') maxOccurs = Number.MAX_SAFE_INTEGER;
		if (isAttribute) {
			if ((!element["@use"]) || (element["@use"] != 'required')) minOccurs = 0;
		}
		if (element["@isChoice"]) minOccurs = 0;

		var typeData = mapType(type);
		if (isAttribute && (typeData.type == 'object')) {
			typeData.type = 'string'; // handle case where attribute has no defined type
		}

		if (typeData.type == 'object') {
			typeData.properties = {};
			newTarget = typeData;
		}

		var enumSource;

		if (element["xs:simpleType"] && element["xs:simpleType"]["xs:restriction"] && element["xs:simpleType"]["xs:restriction"]["xs:enumeration"]) {
			var enumSource = element["xs:simpleType"]["xs:restriction"]["xs:enumeration"];
		}
		else if (element["xs:restriction"] && element["xs:restriction"]["xs:enumeration"]) {
			var enumSource = element["xs:restriction"]["xs:enumeration"];
		}

		if (enumSource) {
			typeData["enum"] = [];
			for (var i=0;i<enumSource.length;i++) {
				typeData["enum"].push(enumSource[i]["@value"]);
			}
			delete typeData.type; // assert it was a stringish type?
		}
		else {
			if ((typeData.type == 'string') || (typeData.type == 'boolean') || (typeData.type == 'array') || (typeData.type == 'object')
				|| (typeData.type == 'integer') || (typeData.type == 'number') || (typeData.type == 'null')) {
				//typeData.type = typeData.type;
			}
			else {
				if (typeData.type.indexOf(':')>=0) {
					typeData["$ref"] = '/'+typeData.type.replace(':','/');
				}
				else {
					typeData["$ref"] = '#/definitions/'+typeData.type;
				}
				delete typeData.type;
			}
		}

		if (maxOccurs > 1) {
			var newTD = {};
			newTD.type = 'array';
			if (minOccurs > 0) newTD.minItems = parseInt(minOccurs,10);
			if (maxOccurs < Number.MAX_SAFE_INTEGER) newTD.maxItems = parseInt(maxOccurs,10);
			newTD.items = typeData;
			typeData = newTD;
		}
		if (minOccurs > 0) {
			mandate(target,name);
		}

		if (simpleType) {
			if (simpleType["xs:minLength"]) typeData.minLength = parseInt(simpleType["xs:minLength"]["@value"],10);
			if (simpleType["xs:maxLength"]) typeData.maxLength = parseInt(simpleType["xs:maxLength"]["@value"],10);
			if (simpleType["xs:pattern"]) typeData.pattern = simpleType["xs:pattern"]["@value"];
		}

		target.properties[name] = typeData; // Object.assign 'corrupts' property ordering
		target.additionalProperties = false;

		target = newTarget;
	}
}

function moveAttributes(obj,parent,key) {
	if (key == 'xs:attribute') {

		obj[key] = toArray(obj[key]);

		var target;

		if (obj["xs:sequence"] && obj["xs:sequence"]["xs:element"]) {
			obj["xs:sequence"]["xs:element"] = toArray(obj["xs:sequence"]["xs:element"]);
			target = obj["xs:sequence"]["xs:element"];
		}
		if (obj["xs:choice"] && obj["xs:choice"]["xs:element"]) {
			obj["xs:choice"]["xs:element"] = toArray(obj["xs:choice"]["xs:element"]);
			target = obj["xs:choice"]["xs:element"];
		}

		if (target) target = toArray(target);

		for (var i=0;i<obj[key].length;i++) {
			var attr = clone(obj[key][i]);
			if (attributePrefix) {
				attr["@name"] = attributePrefix+attr["@name"];
			}
			if (typeof attr == 'object') {
				attr["@isAttr"] = true;
			}
			if (target) target.push(attr)
			else obj[key][i] = attr;
		}
		if (target) delete obj[key];
	}
}

function processChoice(obj,parent,key) {
	if (key == 'xs:choice') {
		var e = obj[key]["xs:element"] = toArray(obj[key]["xs:element"]);
		for (var i=0;i<e.length;i++) {
			if (!e[i]["@isAttr"]) {
				e[i]["@isChoice"] = true;
			}
		}
		if (obj[key]["xs:group"]) {
			var g = obj[key]["xs:group"] = toArray(obj[key]["xs:group"]);
			for (var i=0;i<g.length;i++) {
				if (!g[i]["@isAttr"]) {
					g[i]["@isChoice"] = true;
				}
			}
		}
	}
}

function renameObjects(obj,parent,key) {
	if (key == 'xs:complexType') {
		var name = obj["@name"];
		if (name) {
			rename(obj,key,name);
		}
		else debuglog('complexType with no name');
	}
}

function moveProperties(obj,parent,key) {
	if (key == 'xs:sequence') {
		if (obj[key].properties) {
			obj.properties = obj[key].properties;
			obj.required = obj[key].required;
			obj.additionalProperties = false;
			delete obj[key];
		}
	}
}

function clean(obj,parent,key) {
	if (key == '@name') delete obj[key];
	if (key == '@type') delete obj[key];
}

function removeEmpties(obj,parent,key) {
	var count = 0;
	if (isEmpty(obj[key])) {
		delete obj[key];
		count++;
	}
	else {
		if (Array.isArray(obj[key])) {
			var newArray = [];
			for (var i=0;i<obj[key].length;i++) {
				if (typeof obj[key][i] !== 'undefined') {
					newArray.push(obj[key][i]);
				}
				else {
					count++;
				}
			}
			if (newArray.length == 0) {
				delete obj[key];
				count++;
			}
			else {
				obj[key] = newArray;
			}
		}
	}
	return count;
}

function recurse(obj,parent,callback,depthFirst) {

	var oTarget = target;

	if (typeof obj != 'string') {
		for (var key in obj) {
			target = oTarget;
			// skip loop if the property is from prototype
			if (!obj.hasOwnProperty(key)) continue;

			if (!depthFirst) callback(obj,parent,key);

			var array = Array.isArray(obj);

			if (typeof obj[key] === 'object') {
				if (array) {
					for (var i in obj[key]) {
						recurse(obj[key][i],obj[key],callback);
					}
				}
				recurse(obj[key],obj,callback);
			}

			if (depthFirst) callback(obj,parent,key);
		}
	}

	return obj;
}

module.exports = {
	getJsonSchema : function getJsonSchema(src,title,attrPrefix,laxURIs) { // TODO convert to options parameter
		reset(attrPrefix,laxURIs);

		recurse(src,{},function(src,parent,key) {
			moveAttributes(src,parent,key);
		});
		recurse(src,{},function(src,parent,key) {
			processChoice(src,parent,key);
		});

		var obj = {};

		var id = src["xs:schema"]["@targetNamespace"];
		if (!id) {
			id = src["xs:schema"]["@xmlns"];
		}

		//initial root object transformations
		obj.title = title;
		obj.$schema = 'http://json-schema.org/schema#'; //for latest, or 'http://json-schema.org/draft-04/schema#' for v4
		if (id) {
			obj.id = id;
		}

		var rootElement = src["xs:schema"]["xs:element"];
		if (Array.isArray(rootElement)) {
			rootElement = rootElement[0];
		}
		var rootElementName = rootElement["@name"];

		obj.type = 'object';
		obj.properties = clone(rootElement);

		obj.required = [];
		obj.required.push(rootElementName);
		obj.additionalProperties = false;

		recurse(obj,{},function(obj,parent,key) {
			renameObjects(obj,parent,key);
		});

		// support for schemas with just a top-level name and type (no complexType/sequence etc)
		if (obj.properties["@type"]) {
			target = obj; // tell it where to put the properties
		}
		else {
			delete obj.properties["@name"]; // to prevent root-element being picked up twice
		}

		recurse(obj,{},function(src,parent,key) { // was obj.properties
			doElement(src,parent,key);
		});

		recurse(obj,{},function(obj,parent,key) {
			moveProperties(obj,parent,key);
		});

		// remove rootElement to leave ref'd definitions
		if (Array.isArray(src["xs:schema"]["xs:element"])) {
			//src["xs:schema"]["xs:element"] = src["xs:schema"]["xs:element"].splice(0,1);
			delete src["xs:schema"]["xs:element"][0];
		}
		else {
			delete src["xs:schema"]["xs:element"];
		}

		obj.definitions = clone(src);
		obj.definitions.properties = {};
		target = obj.definitions;

		recurse(obj.definitions,{},function(src,parent,key) {
			doElement(src,parent,key);
		});

		// correct for /definitions/properties
		obj.definitions = obj.definitions.properties;

		recurse(obj,{},function(obj,parent,key) {
			clean(obj,parent,key);
		});

		delete(obj.definitions["xs:schema"]);

		var count = 1;
		while (count>0) { // loop until we haven't removed any empties
			count = 0;
			recurse(obj,{},function(obj,parent,key) {
				count += removeEmpties(obj,parent,key);
			});
		}

		return obj;
	}
};