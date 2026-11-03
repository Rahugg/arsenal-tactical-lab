.DEFAULT_GOAL := demo
PORT ?= 8765

.PHONY: demo run
demo run:
	@PORT="$(PORT)" ./run_lab.command
