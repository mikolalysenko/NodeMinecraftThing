//For DNode
if (typeof JSON == 'undefined') {
    JSON = {};
    
    JSON.stringify = function (ref) {
        var s = '';
        Traverse(ref).forEach(function to_s (node) {
            if (node instanceof Array) {
                this.before(function () { s += '[' });
                this.post(function (child) {
                    if (!child.isLast) s += ',';
                });
                this.after(function () { s += ']' });
            }
            else if (typeof node == 'object') {
                this.before(function () { s += '{' });
                this.pre(function (x, key) {
                    to_s(key);
                    s += ':';
                });
                this.post(function (child) {
                    if (!child.isLast) s += ',';
                });
                this.after(function () { s += '}' });
            }
            else if (typeof node == 'string') {
                s += '"' + node.toString().replace(/"/g, '\\"') + '"';
            }
            else if (typeof node == 'function') {
                s += 'null';
            }
            else {
                s += node.toString();
            }
        });
        return s;
    };
    
    JSON.parse = function (s) {
        return eval('(' + s + ')'); // meh, I'm lazy
    };
}

if (!Object.keys) Object.keys = function (obj) {
    var keys = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            keys.push(key);
    }
    return keys;
};

if (typeof Object.create === 'undefined') {
    Object.create = function (o) {
        function F() {}
        F.prototype = o;
        return new F();
    };
}

if (!Array.prototype.forEach) Array.prototype.forEach = function (f, to) {
    for (var i = 0; i < this.length; i++) {
        f.call(to, this[i], i, this);
    }
};

if (!Array.isArray) Array.isArray = function (ref) {
    return Object.prototype.toString.call(ref) === '[object Array]';
};

if (!Array.prototype.some) Array.prototype.some = function (f, to) {
    for (var i = 0; i < this.length; i++) {
        if (f.call(to, this[i], i, this)) return true;
    }
    return false;
};

if (!Array.prototype.every) Array.prototype.every = function (f, to) {
    for (var i = 0; i < this.length; i++) {
        if (!f.call(to, this[i], i, this)) return false;
    }
    return true;
};

if (!Array.prototype.indexOf) Array.prototype.indexOf = function (x) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] === x) return i;
    }
    return -1;
};




