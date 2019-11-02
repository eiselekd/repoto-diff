
/**
 * diff(a, b [, eql]) diffs the array-like objects `a` and `b`, returning
 * a summary of the edits made. By default, strict equality (`===`) is
 * used to compare items in `a` and `b`; if this will not work (for example,
 * if the items in `a` and `b` are objects), a custom equality function,
 * `eql`, may be passed as a third argument.
 *
 * @param {Array} a
 * @param {Array} b
 * @param {Function} eql
 * @return {Array}
 */
function diff (a, b, eql) {
  eql = eql || strictEqual

  var N = a.length
  var M = b.length
  var MAX = N + M

  var V = {}
  var Vs = []

  V[1] = 0
  for (var D = 0; D <= MAX; D += 1) {
    for (var k = -D; k <= D; k += 2) {
      var x, y

      if (k === -D || (k !== D && V[k - 1] < V[k + 1])) {
        x = V[k + 1]
      } else {
        x = V[k - 1] + 1
      }

      y = x - k
      while (x < N && y < M && eql(a[x], b[y])) {
        x += 1
        y += 1
      }

      V[k] = x
      if (x >= N && y >= M) {
        Vs[D] = Object.assign({}, V)
        return buildEdits(Vs, a, b)
      }
    }

    Vs[D] = Object.assign({}, V)
  }

  // ?
  throw Error('Unreachable diff path reached')
}

// Used when no equality function is given to diff()
function strictEqual (a, b) {
  return a === b
}

/**
 * buildEdits(Vs, a, b) builds an array of edits from the edit graph,
 * `Vs`, of `a` and `b`.
 *
 * @param {Array} Vs
 * @param {Array} a
 * @param {Array} b
 * @return {Array}
 */
function buildEdits (Vs, a, b) {
  var edits = []

  var p = { x: a.length, y: b.length }
  for (var D = Vs.length - 1; p.x > 0 || p.y > 0; D -= 1) {
    var V = Vs[D]
    var k = p.x - p.y

    var xEnd = V[k]

    var down = (k === -D || (k !== D && V[k - 1] < V[k + 1]))
    var kPrev = down ? k + 1 : k - 1

    var xStart = V[kPrev]
    var yStart = xStart - kPrev

    var xMid = down ? xStart : xStart + 1

    while (xEnd > xMid) {
      pushEdit(edits, a[xEnd - 1], false, false)
      xEnd -= 1
    }

    if (yStart < 0) break

    if (down) {
      pushEdit(edits, b[yStart], true, false)
    } else {
      pushEdit(edits, a[xStart], false, true)
    }

    p.x = xStart
    p.y = yStart
  }

  return edits.reverse()
}

/**
 * pushEdit(edits, item, added, removed) adds the given item to the array
 * of edits. Similar edits are grouped together for conciseness.
 *
 * @param {Array} edits
 * @param {*} item
 * @param {Boolean} added
 * @param {Boolean} removed
 */
function pushEdit (edits, item, added, removed) {
  var last = edits[edits.length - 1]

  if (last && last.added === added && last.removed === removed) {
    last.items.unshift(item) // Not push: edits get reversed later
  } else {
    edits.push({
      items: [item],
      added: added,
      removed: removed
    })
  }
}


var globalId=100

function globalIdnext() {
    return ++globalId;
}

function pathvar (r) {
    this.n = r['n'];
    this.attr = {'class' : ['selpathvar']};
    this.path = r.path;
    this.stopregister = r['stopregister'];
    this.c = [];
    this.gid = ++globalId;
}
pathvar.prototype.id = function() {
    return this.n;
};

function repovar (r) {
    this.n = r['n'];
    this.path = r['path'];
    this.gn = r['gid'];
    this.sha = r['sha'];
    this.server = r['server'];
    this.attr = {'class' : ['selrepovar','sha'+r['sha']]};
    this.c = [];
    this.gid = ++globalId;
    this.events = [];
    this.data = {'0':{},'1':{}};
}
repovar.prototype.id = function() {
    return this.n;
};
repovar.prototype.gid = function() {

    return this.gid;
};
repovar.prototype.propagate_event = function(e,htmlobj,obj) {
    if (e in this.events) {
        this.events[e].apply(htmlobj, [obj]);
    }
};

function threadpath(r, a, p, upto) {
    var h = {};
    // create lookup of already present subfolders
    for (var idx in r) {
        h[r[idx].n] = r[idx];
    }
    // next path element
    var cn = a.shift();
    upto.push(cn);
    var e = undefined;
    // create new element
    if (!(cn in h)) {
        if (a.length != 0) {
            e = new pathvar({'n': cn, path: upto.join("/")});
            r.push(e);
        } else {
            e = p;
            if (!(e instanceof repovar)) {
                e = new repovar({'n': cn, 'gid': ++globalId, 'sha': p.sha, 'path': p.path})
            } else {
                e.n = cn;
                e.gid = ++globalId;
            }
            r.push(e);
        }
        r.sort(function(a, b) { return ('' + a.n).localeCompare(b.n); });
    } else {
        e = h[cn];
    }
    if (a.length != 0)
    {
        threadpath(e.c, a, p, upto);
    }
}

function expandAll(fn, ln) {
    $('.menu-tree li > ul').each(function(i) {
        $(this).show();
    });
    $(".menu-tree").find("span").addClass("expanded");
}

function collapseAll(fn, ln) {
    $('.menu-tree li > ul').each(function(i) {
        $(this).hide();
    });
    $(".menu-tree").find("span").removeClass("expanded");
}

function viewOnlyChanged()
{
    var a = $("#d2_a");
}

function gen_tree(n)
{
    this.c = [];
    this.n = n;
    this.e = {'color':0,'attr':{'class':[]}};
    this.color = 0;
    this.issort = 1;
}

function ismember(a,n)
{
    for (var i in a)
    {
        if (a[i] == n)
            return 1;
    }
    return 0;
}

gen_tree.prototype.genar = function(a)
{
    var n = [];
    for (var e of a) {
        var c = new gen_tree(e['n']);
        n.push(c);
        c.e = e;
        if ('c' in e) {
            c.genar(e.c);
        }
    }
    this.c = this.c.concat(n);
}

gen_tree.prototype.gen = function(na,e)
{
    var _n = [...na]
    var n = _n.shift();
    var c = this.c.find(function(a) { return a.n == n });
    if (c == undefined)
    {
        c = new gen_tree(n);
        this.c.push(c);
    }
    if (this.issort) {
        this.c.sort(function(a, b) { return ('' + a.n).localeCompare(b.n); });
    }
    if (_n.length != 0)
    {
        c.gen(_n,e);
        if (e != undefined)
            c.e.color |= e.color;
    } else {
        c.e = e;
    }
}

function converthexcolor(a)
{
    var k = ""; var i;
    for (i = 0; i < 6;  i++ )
    {
        var j = a & 0xf; a >>= 4;
        k = j.toString(16)+k;
    }
    return k;
}

var index = 1;
gen_tree.prototype.htmlid = function(na)
{
    var id = "idnum"+(index++);
    if (this.e != undefined &&
        'path' in this.e)
    {
        id = this.e['path'];
        id = id.replace(/[\/\s\.@:\-]/ig, "_");
    }
    return id;
}

gen_tree.prototype.gid = function(na)
{
    var id = 0;
    if (this.e != undefined &&
        'gid' in this.e)
    {
        id = this.e['gid'];
    }
    return id;
}

gen_tree.prototype.selector = function(na)
{
    var id = this.htmlid();
    if (!id.startsWith("#"))
    {
        id = "#" + id;
    }
    return id;
}

gen_tree.prototype.getli = function(na)
{
    var id = this.selector();
    var e = $(id);
}

gen_tree.prototype.htmlchilds = function(na)
{
    var c = [];
    for (var i in this.c)
    {
        var e = this.c[i];
        c.push(e.html(na));
    }
    var l = c.join("\n");
    var ul = "<ul> " + l + "</ul>";
    var id = this.selector();
    var e = $(id+" ul").replaceWith(ul);
}

gen_tree.prototype.isinstantiated = function(na)
{
    var id = this.selector();
    var e = $(id);
    return (e.length);
}

gen_tree.prototype.reinstantiate = function(na)
{
    var dirty = 0;
    for (var i in this.c)
    {
        var e = this.c[i];
        if (! e.isinstantiated()) {
            dirty = 1;
        }
    }
    if (dirty)
    {
        console.log("Need instance of child "+this.htmlid());
        this.htmlchilds(na);
    }
    else
    {
        console.log("Instance "+this.htmlid());
    }
    for (var i in this.c)
    {
        var e = this.c[i];
        e.reinstantiate(na);
    }
}


gen_tree.prototype.html = function(parent, na)
{
    var c = [];
    for (var i in this.c) {
        var e = this.c[i];
        c.push(e.html(this, na));
    }
    var func = 'selgroup'; var arg0 = ""; var arg1 = "file";
    var a = ['expanded'];
    if (this.e != undefined &&
        'attr' in this.e &&
        'class' in this.e['attr'])
    {
        var toadd = this.e['attr']['class'];
        if (toadd[0] != undefined)
            func = toadd[0];
        if ('dir' in toadd) {
            arg1 = 'dir';
        }
        arg0 = this.e['path'];
        if ('arg0' in this.e)
            arg0 = this.e['arg0']
        if ('arg1' in this.e)
            arg1 = this.e['arg1']
        a = a.concat(toadd);
    }
    var col = "";

    if (this.e != undefined && (this.e.color && !ismember(this.e.attr.class,'file')))
    {
        col = 0xffffff;
        if (this.e.color & 0x2) { // grey
            col -= 0x101010;
        } else if (this.e.color & 0x4) { // green
            col -= 0x300030;
        } else if (this.e.color & 0x1) { // red
            col -= 0x003030;
        }
        col = converthexcolor(col);
        //console.log(col);
        col = "background-color:#"+col;
    }

    var l = c.join("\n");
    var id = this.htmlid();
    var gid = this.gid();
    var pgid = "";
    if (parent != undefined) {
        pgid = " data-tt-parent-id=\""+parent.gid()+"\" ";
    }
    //var pgid = this.htmlid();
    if (arg0 == undefined)
        arg0 = id;
    var args = [arg0, arg1, id].map(function(a) { return "\""+a+"\""; }).join(",");

    // closure handlers
    var onoffcheckbox = "";
    var repobranchselect = "---";
    var reposhaselect = "---";
    if (this.e instanceof repovar) {
        var e = this.e;
        var onoffid = "onoff-"+id;
        onoffcheckbox = "<input type=\"checkbox\" id=\""+onoffid+"\" class=\"bumpcheck\"/>";
        defered_event_handler.push([onoffid, "change", function() {
            e.propagate_event("onoff", this, e);
        } ]);

        var repobranchid = "repobranch-"+id;
        if (this.e['sha_a'] != undefined) {
            repobranchselect = this.e['sha_a']; // "<select id=\""+repobranchid+"\" class=\"bumpselectbox repoelem\"></select>";
            defered_event_handler.push([repobranchid, "click", function() {
                e.propagate_event("repobranch", this, e);
            } ]);
        }

        var reposhaid = "reposha-"+id;
        if (this.e['sha_b'] != undefined) {
            reposhaselect = this.e['sha_b']; //"<select id=\""+reposhaid+"\" class=\"shaselectbox repoelem\"></select>";
            defered_event_handler.push([reposhaid, "click", function() {
                e.propagate_event("reposha", this, e);
            } ]);
        }
    } else {
        repobranchselect = "";
        reposhaselect = "";
    }

    return "<tr data-tt-id=\""+gid+"\" "+pgid+" id=\""+id+"\" ><td>"+onoffcheckbox+"<span class=\""+a.join(" ")+"\"><a style=\""+col+"\" onclick='"+func+"("+args+")' >" + this.n + "</a></span></td><td width=\"20\"></td><td width=\"\">"+repobranchselect+"</td><td width=\"\">"+reposhaselect+"</td></tr> " + l + "";

}


function propagate(e,r,g,b) {

}

/* ------------------ idify ------------------*/

function idify(a) {
    var r = [];
    for (var i of a) {
        console.log(i);
        var j = i.id();
        r.push(j);
    }
    return r;
}

function unidify(d, a, b) {
    var a_i = 0;
    var b_i = 0;
    var r = [];
    for (i of d) {
        if (i.added && ! i.removed) {
            for (var j = 0; j < i.items.length; j++)
                r.push([undefined,b[b_i++]]);
        } else if (!i.added &&i.removed) {
            for (var j = 0; j < i.items.length; j++)
                r.push([a[a_i++],undefined]);
        } else if  (!i.added && !i.removed) {
            for (var j = 0; j < i.items.length; j++)
                r.push([a[a_i++],b[b_i++]]);
        } else {
            throw Error("Undef");
        }
    }
    return r;
}

function propagate(e,c) {
    if (c == "diffremoved") {
        e['sha_a'] = e['sha'];
        e['server_a'] = e['server'];
    } else {
        e['sha_b'] = e['sha'];
        e['server_b'] = e['server'];
    }

    e.attr.class.push(c);
    for (var i of e.c) {
        propagate(i,c);
    }
}

function diffhirarchy(a,b,order=[],register=[]) {
    console.log("a");console.log(a);
    console.log("b");console.log(b);
    var a_i = idify(a);
    var b_i = idify(b);
    console.log("a_i");console.log(a_i);
    console.log("b_i");console.log(b_i);
    var d = diff(a_i, b_i);
    console.log("log");console.log(d);
    var u = unidify(d, a, b);
    //console.log(u);
    var result = [];
    for (var e of u) {
        if (e[0] == undefined && e[1] != undefined) {

            if (e[1].n=="arm-eabi-4.6") {
                console.log("Found");
            }

            propagate(e[1], "diffremoved");
            e[1]['sha_a'] = e[1]['sha'];
            e[1]['server_a'] = e[1]['server'];
            result.push(e[1]);
            try { if (e[1].gid()) register.push(e); } catch(e) {};
        }
        if (e[0] != undefined && e[1] == undefined) {

            if (e[0].n=="arm-eabi-4.6") {
                console.log("Found");
            }

            propagate(e[0], "diffnew");
            e[0]['sha_b'] = e[0]['sha'];
            e[0]['server_b'] = e[0]['server'];
            result.push(e[0]);
            try { if (e[0].gid()) register.push(e); } catch(e) {};
        }
        if (e[0] != undefined && e[1] != undefined) {
            var e0 = e[0];
            var e1 = e[1];
            if (e0.stopregister || e1.stopregister)
                register = [];
            var c = diffhirarchy(e0.c, e1.c,order,register);
            try {
                e1 = e1.clone();
            } catch(e) {};
            e1['sha_b'] = e1['sha'];
            e1['sha_a'] = e0['sha'];
            e1['server_b'] = e1['server'];
            e1['server_a'] = e0['server'];
            e1.c = c;
            result.push(e1);
            try { if (e[0].gid()) register.push(e); } catch(e) {};
        }
    }
    if (order.length) {
        var head = []
        for (var i of order) {
            var _r = []
            for (var j of result) {
                if (j.n == i) {
                    head.push(j);
                } else {
                    _r.push(j);
                }
            }
            result = _r;
        }
        result = head.concat(result);
    }
    return result;
}

/* -------------------- click handler --------------------- */

function treeCodeClickSetup() {
    // Find list items representing folders and
    // style them accordingly.  Also, turn them
    // into links that can expand/collapse the
    // tree leaf.
    $('.menu-tree li > ul').each(function(i) {
        // Find this list's parent list item.
        var parent_li = $(this).parent('li');

        // Temporarily remove the list from the
        // parent list item, wrap the remaining
        // text in an anchor, then reattach it.
        var sub_ul = $(this).remove();
        parent_li.find('a').click(function() {
            // Make the anchor toggle the leaf display.
            sub_ul.toggle(300);

            //Add class to change folder image when clicked on
            $(this).find('span:first-child').toggleClass('expanded');

        });
        parent_li.append(sub_ul);
    });
    // Hide all lists except the outermost.
    //$('.menu-tree ul ul').hide();
};
