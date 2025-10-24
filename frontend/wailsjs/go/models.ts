export namespace main {
	
	export class ValidationResult {
	    isValid: boolean;
	    errorMessage: string;
	
	    static createFrom(source: any = {}) {
	        return new ValidationResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.isValid = source["isValid"];
	        this.errorMessage = source["errorMessage"];
	    }
	}
	export class WenFileData {
	    ver: string;
	    createdAt: string;
	    modifiedAt: string;
	    content: string;
	
	    static createFrom(source: any = {}) {
	        return new WenFileData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ver = source["ver"];
	        this.createdAt = source["createdAt"];
	        this.modifiedAt = source["modifiedAt"];
	        this.content = source["content"];
	    }
	}

}

