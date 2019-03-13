class ClassUtil
{
	static getQualifiedClassName(value) 
	{
		if(!value) return null;
		if(value.constructor && value.constructor.name) {
			if(value.constructor.name=="Function") return value.name;
			return value.constructor.name;
		}
		
		let prototype;
		
		try{
			prototype = value.prototype ? value.prototype : Object.getPrototypeOf(value);
		}
	    catch(e){
	    	trace("[ERROR] ClassUtil.getQualifiedClassName",e);
	    	return;
	    }
	    
	    if (prototype.hasOwnProperty("__class__")) {
	        return prototype["__class__"];
	    }
	    let constructorString = prototype.constructor.toString();
	    let index = constructorString.indexOf("(");
	    let className = constructorString.substring(9, index);
	    Object.defineProperty(prototype, "__class__", {
	        value: className,
	        enumerable: false,
	        writable: true
	    });
	    return className;
	}
	
	static getQualifiedSuperclassName(value) 
	{
	    let prototype = value.prototype ? value.prototype : Object.getPrototypeOf(value);
	    if (prototype.hasOwnProperty("__superclass__")) {
	        return prototype["__superclass__"];
	    }
	    let superProto = Object.getPrototypeOf(prototype);
	    if (superProto == null)
	        return null;
	    let superClass = ClassUtil.getQualifiedClassName(superProto.constructor);
	    if (!superClass)
	        return null;
	    Object.defineProperty(prototype, "__superclass__", {
	        value: superClass,
	        enumerable: false,
	        writable: true
	    });
	    return superClass;
	}
	
	static getDefinitionByName(name) 
	{
	    if (StringUtil.isEmpty(name)) return null;
	    let definition = ClassUtil.__getDefinitionByName__cache[name];
	    
	    if (definition) {
	        return definition;
	    }
	    
	    let paths = name.split(".");
	    let length = paths.length;
	    definition = Global.root;
	    
	    for (let i = 0; i < length; i++) {
	        let path = paths[i];
	        definition = definition[path];
	        if (!definition) {
	            return null;
	        }
	    }
	    
	    ClassUtil.__getDefinitionByName__cache[name] = definition;
	    return definition;
	}
}

ClassUtil.__getDefinitionByName__cache={};
