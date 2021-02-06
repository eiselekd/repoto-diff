#!python3
import os, re, json, time, copy, argparse, subprocess
from random import randrange
import shutil
from glob import glob
# apt install python-git
from git import Repo
# apt install python-flask
from flask import (
    Flask,
    request,
    render_template,
    send_from_directory
)
from repo.manifest import manifest, mh_project

cdir=os.path.dirname(os.path.abspath(__file__))

# git clone https://gitlab.com/noppo/gevent-websocket.git
from geventwebsocket.handler import WebSocketHandler
# git clone https://github.com/fgallaire/wsgiserver
from gevent.pywsgi import WSGIServer

parser = argparse.ArgumentParser(prog='dumpgen')
parser.add_argument('--verbose', action='store_true', help='verbose')
parser.add_argument('--prepare', action='store_true', help='verbose')
parser.add_argument('--a', '-a', type=str, default='test/manifest_test_a', help='repo manifest dir a')
parser.add_argument('--b', '-b', type=str, default='test/manifest_test_b', help='repo manifest dir b')
parser.add_argument('--workdir', '-w', type=str, default='/tmp/repo_work', help='work directory')
parser.add_argument('repos', nargs='*')
opt = parser.parse_args()

app = Flask(__name__, template_folder=".")
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0


@app.route('/<path:path>')
def static_file(path):
    return send_from_directory(cdir, path)

repodir=opt.a
workdir=opt.workdir; #"/tmp/repoto"
prepare_repobranch="master";
prepare_manifest="/data/repo/default.xml";

def serverFrom(r,e,typ="fetch"):
    if (typ == "fetch"):
        server=e.xml.attrib['_gitserver_']
    else:
        server=e.xml.attrib['_reviewserver_']
    #print("%s:%s:%s" %(typ,server,str(e)));
    if (server.startswith("..")):
        repofetchurl = [n for n in r.remotes[0].urls][0]
        a = repofetchurl.split("/");
        #print ("----- " + str(a));
        a.pop()
        a.pop()
        #print ("----- " + str(a));
        a.append (e.name);
        #print ("----- " + str(a));
        server = "/".join(a);
    else:
        if (not server.endswith("/")):
            server+="/"
        server+=e.name;
    #print ("----- " + server);
    return server

############################################
#
def listOfRepoBranches(rv, f):
    r=[]
    for bn in rv.git.branch("-a").split("\n"):
        bn = bn.strip()
        if (bn.startswith("*")):
            bn = bn[1:].strip();
        m = re.match(f, bn)
        if (m):
            g = m.group(1);
            print("> match: {} : {}".format(bn.strip(), g))
            if not (g.find("HEAD ->") == -1):
                continue
            if (g.startswith("refs/heads/")):
                g = g[len("refs/heads/"):]
            r.append(g)
    return r;

def listOfManifestRepoBranches(d):
    manifestrepo=Repo(d)
    for remote in manifestrepo.remotes:
        remote.fetch()
    return listOfRepoBranches(manifestrepo, ".*origin/(.+)");

def serverUrlToPath(url):
    url = url.replace("/","_");
    url = url.replace(":","_");
    if not (url.endswith(".git")):
        url += ".git"
    return url;

def repoBranches(repourl, localbase=None):
    global workdir;
    base = workdir
    if (localbase is not None):
        base = os.path.join(base, localbase)
    d = os.path.join(base, serverUrlToPath(repourl)); # "/tmp/repo_work"
    branches = [];
    try:
        rv=Repo(d)
        for remote in rv.remotes:
            remote.fetch()
    except Exception as e:
        print("Error Repo:"+str(e))
        print("try clone '{}' into '{}'".format(repourl, d));
        rv=Repo.clone_from(repourl, d, multi_options=["--mirror"])
    return listOfRepoBranches(rv,"(.+)");


def repoBranchComits(repodir, repobranch):
    commits = [];
    rv=Repo(repodir)
    rev = "refs/heads/"+repobranch
    for bn in rv.git.branch("-a").split("\n"):
        bn = bn.strip()
        for i in [ "refs/heads/", "remotes/origin/" ]:
            #print(i + repobranch + " == " + bn)
            if (i + repobranch) == bn:
                rev = i + repobranch;
                break;
    for c in rv.iter_commits(rev=rev, max_count=1000):
        commits.append(c);
    c = [ { 'sha': c.hexsha, 'summary': c.hexsha[0:7] + ":" +c.summary } for c in commits ]
    return c;

def getRepoDir(repourl, localbase=None, nomirror=False):
    global workdir;
    base = workdir
    if (localbase is not None):
        base = os.path.join(base, localbase)
    d = os.path.join(base, serverUrlToPath(repourl)); # "/tmp/repo_work"
    try:
        rv=Repo(d)
        for remote in rv.remotes:
            remote.fetch()
    except Exception as e:
        print("Error Repo:"+str(e))
        print("try clone '{}' into '{}'".format(repourl, d));
        multiopt = []
        if not nomirror:
            multiopt = ["--mirror"]
        rv=Repo.clone_from(repourl, d, multi_options=multiopt)
    return d

def repotags(repourl, localbase=None):
    d = getRepoDir(repourl, localbase);
    rv=Repo(d)
    return [ str(i) for i in rv.tags];

# retrieve tags that are parent of branch
def repotagsof(repourl, branch, localbase=None):
    d = getRepoDir(repourl, localbase);
    rv=Repo(d)
    return [ str(i) for i in rv.tags ];

def repodiff(repourl, sha_a, sha_b, localbase=None):
    d = getRepoDir(repourl, localbase);
    commits = [];
    print("repodiff from '{}'".format(d))
    rv=Repo(d)
    for c in rv.iter_commits(sha_a + ".."+ sha_b, max_count=1000):
        commits.append(c);
    c = [ { 'sha': c.hexsha, 'summary': c.summary } for c in commits ]
    return c;

def repocommit(repourl, sha, localbase=None):
    d = getRepoDir(repourl, localbase);
    r = {}
    print("repocommit from '{}' of {}".format(d,sha))
    rv=Repo(d)
    try:
        c = rv.commit(sha);
        p = rv.git.log("-1", "-p", sha);
        r = { 'sha': c.hexsha, 'src' : p, 'summary': c.summary }
    except Exception as e:
        print(str(e));
    return r;

def update(x, y):
    z = x.copy()   # start with x's keys and values
    z.update(y)    # modifies z with y's keys and values & returns None
    return z



#listOfManifestRepoBranches();
#exit(0);
# r.remotes[0].refs

selobj_ar = ['repodir', 'id', 'mrb', 'mrrev', 'mfn', 'repo', 'review', 'repobranch', 'reposha', 'path', 'server_a', 'server_b', 'sha_a', 'sha_b', 'server', 'sha' ];

class selobj:

    def __init__(self,v):
        global selobj_ar;
        self.v = v;
        for a in selobj_ar:
            if a in v:
                print(" > Select {}: '{}'".format(a,v[a]));

    def __getattr__(self, n):
        if n in self.v:
            return self.v[n]
        return None

    def tohash(self):
        global selobj_ar;
        r = {};
        for a in selobj_ar:
            if a in self.v and not (self.v[a] is None):
                r[a] = self.v[a];
        return r;

    def __str__(self):
        return repr(self.tohash());


@app.route('/api')
def api():
    global opt;
    global workdir;

    if request.environ.get('wsgi.websocket'):
        ws = request.environ['wsgi.websocket']
        localprefix = "%08x"%(randrange(1<<30));
        print("New user %s" %(localprefix))
        base = os.path.join(workdir, localprefix)
        print("New user %s in '%s'" %(localprefix, base))
        # reset local dir
        try:
            shutil.rmtree(base)
        except:
            pass
        try:
            if not os.path.exists(base):
                os.makedirs(base)
        except:
            pass

        repolist = []
        for e in opt.repos:
            a = e.split(":");
            n = a.pop();
            a = ":".join(a);
            p = getRepoDir(a, os.path.join(localprefix,n), nomirror=True);
            repolist.append(p);

        while True:
            req = ws.read_message()
            print("Got '{}'".format(req))
            req = json.loads(req)
            print(str(req));
            if (req['type'] == 'start'):
                startobj = { };
                ws.send(json.dumps({'type': 'md', 'data' : [ update(startobj, {'repodir' : e }) for e in repolist]})) #opt.repos
            elif (req['type'] == 'mdsel'):
                mdsel = selobj(req['data'])
                repobranches = listOfManifestRepoBranches(mdsel.repodir)
                ws.send(json.dumps({'type': 'mrbranches', 'id' : mdsel.id, 'data' : [ update(mdsel.tohash(), {'mrb' : e }) for e in repobranches]}));
            elif (req['type'] == 'mrbsel'):
                mrbsel = selobj(req['data'])
                ba = repoBranchComits(mrbsel.repodir, mrbsel.mrb);
                for e in ba:
                    e['mrrev'] = e['sha'];
                ws.send(json.dumps({'type': 'mrrevs', 'id' : mrbsel.id, 'data' : [ update(mrbsel.tohash(), e ) for e in ba]}));
            elif (req['type'] == 'mrrevsel'):
                mrrevsel = selobj(req['data'])
                r = Repo(mrrevsel.repodir)
                r.git.checkout(mrrevsel.mrrev);
                manifestfiles = sorted(glob("%s/*xml"%(mrrevsel.repodir)));
                ws.send(json.dumps({'type': 'manifestfiles', 'id' : mrrevsel.id, 'data' : [ update(mrrevsel.tohash(), { 'mfn' : e } ) for e in manifestfiles]}));

            elif (req['type'] == 'mfnsel'):
                mfnsel = selobj(req['data'])

                r = Repo(mrbsel.repodir)
                r.git.checkout(mfnsel.mrrev);

                print("Load {}\n".format(mfnsel.mfn))
                m0 = manifest(opt, mfnsel.mfn);
                p0 = m0.get_projar();
                pa = []
                for e in p0.p:
                    server=serverFrom(r,e)
                    p = e.path;
                    if p == None:
                        p = e.name;
                    #print(server + ": " + p)
                    pa.append({ 'path' : p, 'server' : server, 'sha' : e.revision});

                ws.send(json.dumps(update(mfnsel.tohash(), {'type': 'repolist', 'data' : pa})));

            elif (req['type'] == 'repoonoff'):
                repoonoff = selobj(req['data'])
                try:
                    if (req['data']['onoff'] == "on"):
                        server = req['data']['server_a'];
                        add = repodiff(server, req['data']['sha_a'], req['data']['sha_b'], localprefix);
                        rem = repodiff(server, req['data']['sha_b'], req['data']['sha_a'], localprefix);
                        branches = repoBranches(server, localprefix);
                        tags = repotags(server, localprefix);

                        ws.send(json.dumps({'type': 'repodiff', 'data' : update(repoonoff.tohash(), {'add' : add, 'rem' : rem, 'branches': branches, 'tags' : tags})}));
                except Exception as e:
                    print("Request:"+str(req));
                    print(str(e));


            elif (req['type'] == 'reposha'):
                reposha = selobj(req['data'])
                try:
                    c = repocommit(server, req['data']['sha'], localprefix);
                    ws.send(json.dumps({'type': 'reposha', 'data' : update(reposha.tohash(), c)}));
                except Exception as e:
                    print(str(e));

            elif (req['type'] == 'selrebasetag'):
                selrebasetag = selobj(req['data'])
                try:
                    c = repotagsof(server, req['data']['branch'], localprefix);
                    ws.send(json.dumps({'type': 'selrebasetag', 'data' : update(selrebasetag.tohash(), c)}));
                except Exception as e:
                    print(str(e));


            time.sleep(1);


if __name__ == '__main__':

    http_server = WSGIServer(('0.0.0.0',5000), app, handler_class=WebSocketHandler)
    http_server.serve_forever()
