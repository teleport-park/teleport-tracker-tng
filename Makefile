
DOCKER_REPOSITORY?="teleportpark/tracker-ng"
DOCKER_TAG?="dev"

KEYFILE?="license.key"
KEYPASS?="teleport-tracker"

docker:
	docker build -t $(DOCKER_REPOSITORY):$(DOCKER_TAG) -f Dockerfile .
	docker push $(DOCKER_REPOSITORY):$(DOCKER_TAG)

keys:
	echo $(KEYPASS) > $(KEYFILE).pwd
	openssl genrsa -aes256 -passout file:$(KEYFILE).pwd -out $(KEYFILE) 8912
	openssl rsa -in $(KEYFILE) -passin file:$(KEYFILE).pwd -pubout -out $(KEYFILE).pub
