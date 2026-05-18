.PHONY: build build-api tidy test clean

GOOS   := linux
GOARCH := arm64
CGO    := 0
LDFLAGS := -s -w

build: build-api

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
