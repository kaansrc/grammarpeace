#!/bin/sh
# Xcode Cloud runs this right after cloning. The .xcodeproj isn't committed
# (XcodeGen builds it from project.yml), so generate it before the build starts.
set -e
brew install xcodegen
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
xcodegen
