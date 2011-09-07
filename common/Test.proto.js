if (typeof(PROTO)=="undefined") { var PROTO=require("./protobuf.js"); }
if (typeof(PBJ)=="undefined") { var PBJ=require("./pbj.js"); }
if (typeof(exports)!="undefined") { var ProtoJSTest=exports;};
if (typeof(ProtoJSTest)=="undefined") {ProtoJSTest = {};}
if (typeof(ProtoJSTest.PB)=="undefined") {ProtoJSTest.PB = {};}
ProtoJSTest.PB._PBJ_Internal="pbj-0.0.3";

ProtoJSTest.PB.ExternalMessage = PROTO.Message("ProtoJSTest.PB.ExternalMessage",{
SubMessage : PROTO.Message("ProtoJSTest.PB.ExternalMessage.SubMessage",{
	subuuid: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 1
	},
	subvector: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3d;},
		id: 2
	},
	subduration: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.duration;},
		id: 3
	},
	subnormal: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.normal;},
		id: 4
	}})
,
	is_true: {
		options: {default_value:true},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.bool;},
		id: 40
	},
	v2f: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector2f;},
		id: 2
	},
	sub_mes: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return ProtoJSTest.PB.ExternalMessage.SubMessage;},
		id: 30
	},
	submessers: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return ProtoJSTest.PB.ExternalMessage.SubMessage;},
		id: 31
	},
	sha: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.sha256;},
		id: 32
	},
	shas: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return PBJ.sha256;},
		id: 33
	},
	v3f: {
		options: {packed:true},
		multiplicity: PROTO.required,
		type: function(){return PBJ.vector3f;},
		id: 4
	},
	v3ff: {
		options: {packed:true},
		multiplicity: PROTO.repeated,
		type: function(){return PBJ.vector3f;},
		id: 5
	}});
ProtoJSTest.PB.TestMessage = PROTO.Message("ProtoJSTest.PB.TestMessage",{
	xxd: {
		options: {default_value:10.3},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Double;},
		id: 20
	},
	xxf: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.Float;},
		id: 21
	},
	xxu32: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.uint32;},
		id: 22
	},
	xxi32: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.int32;},
		id: 37
	},
	xxsi32: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.sint32;},
		id: 38
	},
	xxs: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.string;},
		id: 23
	},
	xxb: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PROTO.bytes;},
		id: 24
	},
	xxss: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.string;},
		id: 25
	},
	xxbb: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.bytes;},
		id: 26
	},
	xxff: {
		options: {packed:true},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.Float;},
		id: 27
	},
	xxnn: {
		options: {packed:true},
		multiplicity: PROTO.repeated,
		type: function(){return PBJ.normal;},
		id: 29
	},
	xxfr: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.Float;},
		id: 28
	},
	n: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.normal;},
		id: 1
	},
	v2f: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector2f;},
		id: 2
	},
	v2d: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector2d;},
		id: 3
	},
	v3f: {
		options: {packed:true},
		multiplicity: PROTO.required,
		type: function(){return PBJ.vector3f;},
		id: 4
	},
	v3d: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3d;},
		id: 5
	},
	v4f: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector4f;},
		id: 6
	},
	v4d: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector4d;},
		id: 7
	},
	q: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.quaternion;},
		id: 8
	},
	u: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 9
	},
	a: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.angle;},
		id: 10
	},
	t: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.time;},
		id: 11
	},
	d: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.duration;},
		id: 12
	},
	Flagsf32: PROTO.Flags(123456,"ProtoJSTest.PB.TestMessage.Flagsf32",{
		UNIVERSA : 0,
		WE : 1,
		IMAGE : 2,
		LOCA : 3}),
	f32: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return ProtoJSTest.PB.TestMessage.Flagsf32;},
		id: 13
	},
	Flagsf64: PROTO.Flags(123456,"ProtoJSTest.PB.TestMessage.Flagsf64",{
		UNIVERSAL : 0,
		WEB : 1,
		IMAGES : 2,
		LOCAL : 3}),
	Enum32: PROTO.Enum("ProtoJSTest.PB.TestMessage.Enum32",{
		UNIVERSAL1 :0,
		WEB1 :1,
		IMAGES1 :2,
		LOCAL1 :3	}),
	f64: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return ProtoJSTest.PB.TestMessage.Flagsf64;},
		id: 14
	},
	bsf: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.boundingsphere3f;},
		id: 15
	},
	bsd: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.boundingsphere3d;},
		id: 16
	},
	bbf: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.boundingbox3f3f;},
		id: 17
	},
	bbd: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.boundingbox3d3f;},
		id: 18
	},
	e32: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return ProtoJSTest.PB.TestMessage.Enum32;},
		id: 19
	},
SubMessage : PROTO.Message("ProtoJSTest.PB.TestMessage.SubMessage",{
	subuuid: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.uuid;},
		id: 1
	},
	subvector: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3d;},
		id: 2
	},
	subduration: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.duration;},
		id: 3
	},
	subnormal: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.normal;},
		id: 4
	}})
,
	submes: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return ProtoJSTest.PB.TestMessage.SubMessage;},
		id: 30
	},
	submessers: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return ProtoJSTest.PB.TestMessage.SubMessage;},
		id: 31
	},
	sha: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.sha256;},
		id: 32
	},
	shas: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return PBJ.sha256;},
		id: 33
	},
	extmes: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return ProtoJSTest.PB.ExternalMessage;},
		id: 34
	},
	extmessers: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return ProtoJSTest.PB.ExternalMessage;},
		id: 35
	},
	extmesser: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return ProtoJSTest.PB.ExternalMessage;},
		id: 36
	}});
ProtoJSTest.PB.TestMessage = PROTO.Extend(ProtoJSTest.PB.TestMessage,{
	extensionbbox: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.boundingbox3f3f;},
		id: 100
	},
	extensionvector: {
		options: {packed:true},
		multiplicity: PROTO.optional,
		type: function(){return PBJ.vector3f;},
		id: 101
	}});
