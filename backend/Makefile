.PHONY: build build-sync build-api tidy test clean

GOOS   := linux
GOARCH := arm64
CGO    := 0
LDFLAGS := -s -w

build: build-sync build-api

build-sync:
	@echo "Building sync lambda..."
	@mkdir -p dist/sync
	GOOS=$(GOOS) GOARCH=$(GOARCH) CGO_ENABLED=$(CGO) \
		go build -tags lambda.norpc -ldflags "$(LDFLAGS)" \
		-o dist/sync/bootstrap ./cmd/sync

build-api:
	@echo "Building api lambda..."
	@mkdir -p dist/api
	GOOS=$(GOOS) GOARCH=$(GOARCH) CGO_ENABLED=$(CGO) \
		go build -tags lambda.norpc -ldflags "$(LDFLAGS)" \
		-o dist/api/bootstrap ./cmd/api

tidy:
	go mod tidy

test:
	go test ./...

clean:
	rm -rf dist/
