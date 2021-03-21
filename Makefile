-include Makefile.config.mk

all:

start-server:
	mkdir -p /tmp/repo_work
	python3 diff.py test/manifest_test_a test/manifest_test_b


prep2:
	mkdir -p test/
	rm -rf test/flatten_a test/flatten_b
	git clone ssh://eiselekd@localhost:29418/flatten test/flatten_a
	git clone ssh://eiselekd@localhost:29418/flatten test/flatten_b

start-server-2:
	HOME=$(HOMEDIR) python3 diff.py ssh://eiselekd@localhost:29418/flatten:flatten_a ssh://eiselekd@localhost:29418/flatten:flatten_b


prep:
	mkdir -p test/android
	cd test/android; curl https://storage.googleapis.com/git-repo-downloads/repo-1 > /tmp/repo; python3 /tmp/repo init -u https://android.googlesource.com/platform/manifest
	cd test/; ln -sfn android/.repo/manifests manifest_test_a
	cd test/; ln -sfn android/.repo/manifests manifest_test_b

prep-packages:
	sudo apt-get install python3-flask
	sudo apt install python3-gevent-websocket
	sudo apt-get install python3-pygit2
