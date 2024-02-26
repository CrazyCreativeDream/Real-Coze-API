/* Coze AWS Signed by this Script,Crypto Cann't work in it.God knows why. */
function r(e, t, r) {
    return e(r = {
        path: t,
        exports: {},
        require: function(e, t) {
            return function() {
                throw Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs")
            }(null == t && r.path)
        }
    }, r.exports),
    r.exports
}
var i = r(function (e, t) {
    var r, i, n, o, s, a, c, u, l, f, p, h, d, g;
    e.exports = r || (i = Math,
        o = Object.create || function () {
            function e() { }
            return function (t) {
                var r;
                return e.prototype = t,
                    r = new e,
                    e.prototype = null,
                    r
            }
        }(),
        c = (a = (s = {}).lib = {}).Base = {
            extend: function (e) {
                var t = o(this);
                return e && t.mixIn(e),
                    t.hasOwnProperty("init") && this.init !== t.init || (t.init = function () {
                        t.$super.init.apply(this, arguments)
                    }
                    ),
                    t.init.prototype = t,
                    t.$super = this,
                    t
            },
            create: function () {
                var e = this.extend();
                return e.init.apply(e, arguments),
                    e
            },
            init: function () { },
            mixIn: function (e) {
                for (var t in e)
                    e.hasOwnProperty(t) && (this[t] = e[t]);
                e.hasOwnProperty("toString") && (this.toString = e.toString)
            },
            clone: function () {
                return this.init.prototype.extend(this)
            }
        },
        u = a.WordArray = c.extend({
            init: function (e, t) {
                e = this.words = e || [],
                    this.sigBytes = null != t ? t : 4 * e.length
            },
            toString: function (e) {
                return (e || f).stringify(this)
            },
            concat: function (e) {
                var t = this.words
                    , r = e.words
                    , i = this.sigBytes
                    , n = e.sigBytes;
                if (this.clamp(),
                    i % 4)
                    for (var o = 0; o < n; o++) {
                        var s = r[o >>> 2] >>> 24 - o % 4 * 8 & 255;
                        t[i + o >>> 2] |= s << 24 - (i + o) % 4 * 8
                    }
                else
                    for (o = 0; o < n; o += 4)
                        t[i + o >>> 2] = r[o >>> 2];
                return this.sigBytes += n,
                    this
            },
            clamp: function () {
                var e = this.words
                    , t = this.sigBytes;
                e[t >>> 2] &= 4294967295 << 32 - t % 4 * 8,
                    e.length = i.ceil(t / 4)
            },
            clone: function () {
                var e = c.clone.call(this);
                return e.words = this.words.slice(0),
                    e
            },
            random: function (e) {
                for (var t, r = [], n = function (e) {
                    var t = 987654321;
                    return function () {
                        var r = ((t = 36969 * (65535 & t) + (t >> 16) & 4294967295) << 16) + (e = 18e3 * (65535 & e) + (e >> 16) & 4294967295) & 4294967295;
                        return r /= 4294967296,
                            (r += .5) * (i.random() > .5 ? 1 : -1)
                    }
                }, o = 0; o < e; o += 4) {
                    var s = n(4294967296 * (t || i.random()));
                    t = 987654071 * s(),
                        r.push(4294967296 * s() | 0)
                }
                return new u.init(r, e)
            }
        }),
        f = (l = s.enc = {}).Hex = {
            stringify: function (e) {
                for (var t = e.words, r = e.sigBytes, i = [], n = 0; n < r; n++) {
                    var o = t[n >>> 2] >>> 24 - n % 4 * 8 & 255;
                    i.push((o >>> 4).toString(16)),
                        i.push((15 & o).toString(16))
                }
                return i.join("")
            },
            parse: function (e) {
                for (var t = e.length, r = [], i = 0; i < t; i += 2)
                    r[i >>> 3] |= parseInt(e.substr(i, 2), 16) << 24 - i % 8 * 4;
                return new u.init(r, t / 2)
            }
        },
        p = l.Latin1 = {
            stringify: function (e) {
                for (var t = e.words, r = e.sigBytes, i = [], n = 0; n < r; n++) {
                    var o = t[n >>> 2] >>> 24 - n % 4 * 8 & 255;
                    i.push(String.fromCharCode(o))
                }
                return i.join("")
            },
            parse: function (e) {
                for (var t = e.length, r = [], i = 0; i < t; i++)
                    r[i >>> 2] |= (255 & e.charCodeAt(i)) << 24 - i % 4 * 8;
                return new u.init(r, t)
            }
        },
        h = l.Utf8 = {
            stringify: function (e) {
                try {
                    return decodeURIComponent(escape(p.stringify(e)))
                } catch (e) {
                    throw Error("Malformed UTF-8 data")
                }
            },
            parse: function (e) {
                return p.parse(unescape(encodeURIComponent(e)))
            }
        },
        d = a.BufferedBlockAlgorithm = c.extend({
            reset: function () {
                this._data = new u.init,
                    this._nDataBytes = 0
            },
            _append: function (e) {
                "string" == typeof e && (e = h.parse(e)),
                    this._data.concat(e),
                    this._nDataBytes += e.sigBytes
            },
            _process: function (e) {
                var t = this._data
                    , r = t.words
                    , n = t.sigBytes
                    , o = this.blockSize
                    , s = n / (4 * o)
                    , a = (s = e ? i.ceil(s) : i.max((0 | s) - this._minBufferSize, 0)) * o
                    , c = i.min(4 * a, n);
                if (a) {
                    for (var l = 0; l < a; l += o)
                        this._doProcessBlock(r, l);
                    var f = r.splice(0, a);
                    t.sigBytes -= c
                }
                return new u.init(f, c)
            },
            clone: function () {
                var e = c.clone.call(this);
                return e._data = this._data.clone(),
                    e
            },
            _minBufferSize: 0
        }),
        g = (a.Hasher = d.extend({
            cfg: c.extend(),
            init: function (e) {
                this.cfg = this.cfg.extend(e),
                    this.reset()
            },
            reset: function () {
                d.reset.call(this),
                    this._doReset()
            },
            update: function (e) {
                return this._append(e),
                    this._process(),
                    this
            },
            finalize: function (e) {
                return e && this._append(e),
                    this._doFinalize()
            },
            blockSize: 16,
            _createHelper: function (e) {
                return function (t, r) {
                    return new e.init(r).finalize(t)
                }
            },
            _createHmacHelper: function (e) {
                return function (t, r) {
                    return new g.HMAC.init(e, r).finalize(t)
                }
            }
        }),
            s.algo = {}),
        s)
})
    , n = r(function (e, t) {
        var r, n, o, s, a, c, u, l, f;
        e.exports = (r = Math,
            o = (n = i.lib).WordArray,
            s = n.Hasher,
            a = i.algo,
            c = [],
            u = [],
            function () {
                function e(e) {
                    return 4294967296 * (e - (0 | e)) | 0
                }
                for (var t = 2, i = 0; i < 64;)
                    (function (e) {
                        for (var t = r.sqrt(e), i = 2; i <= t; i++)
                            if (!(e % i))
                                return !1;
                        return !0
                    }
                    )(t) && (i < 8 && (c[i] = e(r.pow(t, .5))),
                        u[i] = e(r.pow(t, 1 / 3)),
                        i++),
                        t++
            }(),
            l = [],
            f = a.SHA256 = s.extend({
                _doReset: function () {
                    this._hash = new o.init(c.slice(0))
                },
                _doProcessBlock: function (e, t) {
                    for (var r = this._hash.words, i = r[0], n = r[1], o = r[2], s = r[3], a = r[4], c = r[5], f = r[6], p = r[7], h = 0; h < 64; h++) {
                        if (h < 16)
                            l[h] = 0 | e[t + h];
                        else {
                            var d = l[h - 15]
                                , g = (d << 25 | d >>> 7) ^ (d << 14 | d >>> 18) ^ d >>> 3
                                , y = l[h - 2]
                                , m = (y << 15 | y >>> 17) ^ (y << 13 | y >>> 19) ^ y >>> 10;
                            l[h] = g + l[h - 7] + m + l[h - 16]
                        }
                        var v = i & n ^ i & o ^ n & o
                            , b = (i << 30 | i >>> 2) ^ (i << 19 | i >>> 13) ^ (i << 10 | i >>> 22)
                            , _ = p + ((a << 26 | a >>> 6) ^ (a << 21 | a >>> 11) ^ (a << 7 | a >>> 25)) + (a & c ^ ~a & f) + u[h] + l[h];
                        p = f,
                            f = c,
                            c = a,
                            a = s + _ | 0,
                            s = o,
                            o = n,
                            n = i,
                            i = _ + (b + v) | 0
                    }
                    r[0] = r[0] + i | 0,
                        r[1] = r[1] + n | 0,
                        r[2] = r[2] + o | 0,
                        r[3] = r[3] + s | 0,
                        r[4] = r[4] + a | 0,
                        r[5] = r[5] + c | 0,
                        r[6] = r[6] + f | 0,
                        r[7] = r[7] + p | 0
                },
                _doFinalize: function () {
                    var e = this._data
                        , t = e.words
                        , i = 8 * this._nDataBytes
                        , n = 8 * e.sigBytes;
                    return t[n >>> 5] |= 128 << 24 - n % 32,
                        t[14 + (n + 64 >>> 9 << 4)] = r.floor(i / 4294967296),
                        t[15 + (n + 64 >>> 9 << 4)] = i,
                        e.sigBytes = 4 * t.length,
                        this._process(),
                        this._hash
                },
                clone: function () {
                    var e = s.clone.call(this);
                    return e._hash = this._hash.clone(),
                        e
                }
            }),
            i.SHA256 = s._createHelper(f),
            i.HmacSHA256 = s._createHmacHelper(f),
            i.SHA256)
    })
    , o = (r(function (e, t) {
        var r, n;
        e.exports = (r = i.lib.Base,
            n = i.enc.Utf8,
            void (i.algo.HMAC = r.extend({
                init: function (e, t) {
                    e = this._hasher = new e.init,
                        "string" == typeof t && (t = n.parse(t));
                    var r = e.blockSize
                        , i = 4 * r;
                    t.sigBytes > i && (t = e.finalize(t)),
                        t.clamp();
                    for (var o = this._oKey = t.clone(), s = this._iKey = t.clone(), a = o.words, c = s.words, u = 0; u < r; u++)
                        a[u] ^= 1549556828,
                            c[u] ^= 909522486;
                    o.sigBytes = s.sigBytes = i,
                        this.reset()
                },
                reset: function () {
                    var e = this._hasher;
                    e.reset(),
                        e.update(this._iKey)
                },
                update: function (e) {
                    return this._hasher.update(e),
                        this
                },
                finalize: function (e) {
                    var t = this._hasher
                        , r = t.finalize(e);
                    return t.reset(),
                        t.finalize(this._oKey.clone().concat(r))
                }
            })))
    }),
        r(function (e, t) {
            e.exports = i.HmacSHA256
        }))
    , s = {
        hmac: function (e, t) {
            return o(t, e)
        },
        sha256: function (e) {
            return n(e)
        }
    }
const CozeHash = s;
export default CozeHash;