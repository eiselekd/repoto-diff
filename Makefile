all:

start-server:
	python diff.py test/manifest_test_a test/manifest_test_b


prep:
	mkdir -p test/android
	cd test/android; repo init -u https://android.googlesource.com/platform/manifest;
	cd test/; ln -s android/.repo/manifests manifest_test_a
	cd test/; ln -s android/.repo/manifests manifest_test_b
