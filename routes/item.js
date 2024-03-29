"use strict";
var express = require('express');
var multer = require('multer');
var router = express.Router();
var Item = require('../models/item');
var Course = require('../models/course');
var User = require('../models/user');
var utils = require('../utils');

// upload item img
var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, './public/images/item/');
	},
	filename: function (req, file, cb) {
		// use user name as file name
		var originalName = file.originalname;
		var ext = originalName.split('.');
		cb(null, Date.now() + '.' + ext[ext.length-1]);
	}
});

var upload = multer({
	storage: storage,
	fileFilter: function(req, file, cb) {
		if (file.mimetype.slice(0,5) == 'image') {
			cb(null, true);
		} else {
			cb(new Error('Not an image file!'));
		}	
	},
	limits: {fileSize: 1048576}
});

router.use(function(req, res, next) {
	utils.validateToken(req, res, next);
});

router.route('/')
	.get(function(req, res, next) {
		// see unsold the items
		findUnsoldList(req, res, next);
	})

	.post(upload.single('img'), function(req, res, next) {
		// post a new item
		if (!req.file) {
			res.status(400).json({error: 'No image uploaded.'});
		} else {
			req.body.deptCode = req.body.deptCode || '';
			req.body.courseCode = req.body.courseCode || '';
			var deptCode = '';
			var courseCode = '';
			Course.find({deptCode: req.body.deptCode.toUpperCase()}, function(err, courses) {
				if (err) {
					return next(err);
				} else if (courses.length === 0) {
					deptCode = 'GENERAL';
				} else {
					deptCode = req.body.deptCode.toUpperCase();
					courseCode = 'OTHERS';
					for (var i = 0; i < courses.length; i++) {
						if (courses[i].courseCode === req.body.courseCode.toUpperCase()) {
							courseCode = courses[i].courseCode;
						}
					}
				}
				Item.create({
					deptCode: deptCode,
					courseCode: courseCode,
					seller: req.decoded.uid,
					name: req.body.name,
					description: req.body.description,
					img: req.file.filename,
					price: req.body.price,
					priceFlexible: req.body.priceFlexible,
					sold: false,
					date: Date.now()
				}, function(err) {
					if (err) {
						return next(err);
					} else {
						findUnsoldList(req, res, next);
					}
				});
			});
		}
	});

router.route('/:itemid')
	.get(function(req, res, next) {
		find(req, res, next);
	})

	.put(function(req, res, next) {
		// edit an item
		Item.findOne({_id: req.params.itemid}, function(err, item) {
			if (err) {
				return next(err);
			} else if (item === null) {
				res.status(400).json({error: "Item not found!"});
			} else {
				if (item.seller === req.decoded.uid) {
					item.update({$set: {
						name: req.body.name,
						description: req.body.description,
						price: req.body.price,
						priceFlexible: req.body.priceFlexible
					}}, function(err) {
						if (err) {
							return next(err);
						} else {
							find(req, res, next);
						}
					});
				} else {
					res.status(401).json({error: "You are not the seller of the item!"});
				}
			}
		});
	})

	.delete(function(req, res, next) {
		// delete item: find all transaction records -> set status cancelled -> delete item record
		if (req.decoded.admin) {
			Item.remove({_id: req.params.itemid}, function(err) {
				if (err) {
					// remove item ID from User.buyList
					return next(err);
				} else {
					findUnsoldList(req, res, next);
				}
			});
		} else {
			res.status(401).json({error: "You are not authorized to delete an item!"});
		}
	});

router.route('/buyrequest/:itemid')
	// interest in item: add new record -> set status interested
	.get(function(req, res, next) {
		Item.findOneAndUpdate({_id:req.params.itemid},
			{$push: {buyers: req.decoded.uid}}, 
			function(err) {
				if (err) {
					return next(err);
				} else { 
					User.findOneAndUpdate({uid: req.decoded.uid}, 
						{$push: {buyList: req.params.itemid}}, 
						function(err) {
							if (err) {
								return next(err);
							} else {
								find(req, res, next);
							}
						}
					);
				}
			}
		);
	})

	// uninterest item: delete the record 
	.delete(function(req, res, next) {

	});

// transacted: find all related transactions -> set target success, set others failed
router.get('/transactrequest/:itemid/:uid', function(req, res, next) {
/*	Item.findOne({_id:itemID}, function(err, item) {
		if (err) {
			return next(err);
		} else if (item === null) {
			res.status(400).json({error: "Item not found!"});
		} else {
			// remove item ID from User.buyList
			for (var i = 0; i < item.buyer)
			item.update({$set: {sold: true}}, 
			function(err) {
				if (err) {
					return next(err);
				} else {
					find(req, res, next);
				}
			});
		}
	});*/
});

// return a list of items by searching items by seller's id
router.get('/selllist/:uid', function(req, res, next) {
	//if (req.params.uid === req.decoded.uid || req.decoded.admin)
});

// return a list of items by searching item records by buyer's id
router.get('/buylist/:uid', function(req, res, next) {

});

function findUnsoldList(req, res, next) {
	Item.find({sold: false})
		.sort({date: -1})
		.select ('deptCode courseCode name price priceFlexible date seller img')
		.exec(function(err, items) {
			if (err) {
				return next(err);
			} else {
				res.status(200).json(items);
			}
		});
}

function find(req, res, next) {
	Item.findOne({_id: req.params.itemid}, function(err, item) {
		if (err) {
			next(err);
		} else if (item === null) {
			res.status(400).json({error: "Item not found!"});
		} else {
			res.status(200).json(item);
		}
	});	
}

module.exports = router;