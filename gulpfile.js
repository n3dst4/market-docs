var gulp = require("gulp");
var gutil = require('gulp-util');
var _ = require("lodash");
var Q = require("q");
var fs = require("fs");
var jade = require("jade");

var readFile = Q.denodeify(fs.readFile);
var writeFile = Q.denodeify(fs.writeFile);


gulp.task("default", ["build"]);


gulp.task("build", function () {
	var marketTypeTemplate = jade.compileFile("templates/market-type.jade", {pretty: true});

	var marketTypes = require("./market-types").marketTypes;

	var promises = _.map(marketTypes, function (marketType) {
		return getPromiseForMarketTypeData(marketType).then(function (data) {
			writeFile("__generated/" + marketType.type + ".html", marketTypeTemplate(data));
		});
	});
	
	var indexText = jade.compileFile("templates/index.jade", {pretty: true})(
		{ 
			marketTypes: _.pluck(marketTypes, "type") 
		}
	);
	var indexPromise = writeFile("__generated/index.html", indexText);

	return Q.all(Q.all(promises), indexPromise);
});


function getPromiseForMarketTypeData (marketType) {
	var marketTypeTextPromise = getPromiseForMarketTypeText(marketType.type);
	var tagNameTextPromises = Q.all(
		_.map(marketType.tagNames, getPromiseForTagNameText.bind(null, marketType))
	);
	var selectionTagTextPromises = Q.all(
		_.map(marketType.selectionTags, getPromiseForSelectionTagText.bind(null, marketType))
	);
	return Q.spread([marketTypeTextPromise, tagNameTextPromises, selectionTagTextPromises], 
		function (marketTypeText, tagNameTexts, selectionTagTexts) {
			return {
				type: marketType.type,
				text: marketTypeText,
				tagNames: tagNameTexts,
				selectionTags: selectionTagTexts
			}
		}
	);
}


function getPromiseForTagNameText (marketType, tagName) {
	return getPromiseForThingText(marketType, tagName, "tagName");
}

function getPromiseForSelectionTagText (marketType, selectionTag) {
	return getPromiseForThingText(marketType, selectionTag, "selectionTag");
}

function getPromiseForThingText (marketType, thingName, thingType) {
	var path = "snippets/" + marketType.type + "/" + thingType + "s/" + thingName + ".md"
	gutil.log(path);
	return readFile(path).then(null, function (reason) {
		return readFile("snippets/_common/" + thingType + "s/" + thingName + ".md");
	}).then(null, function (reason) {
		return "NO TEXT WAS FOUND FOR " + thingType + " " + thingName;
	});
}

function getPromiseForMarketTypeText (marketType) {
	return readFile("snippets/"+marketType + "/index.md").then(null, function (reason) {
		return "NO index.md WAS FOUND FOR MARKET TYPE " + marketType;
	});
}

gulp.task('webserver', function() {
    var webserver = require('gulp-webserver');
    process.chdir("__generated");
    gulp.src('.')
        .pipe(webserver({
            livereload: true,
            directoryListing: {
            	enable: true,
            	path: "index.html"
            },
            open: true
        }));
});
