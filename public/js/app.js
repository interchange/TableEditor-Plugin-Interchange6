'use strict';


custom_routes['/Order/list/:type'] = { templateUrl: 'api/plugins/Interchange6/public/views/order_list.html', controller: 'OrderListCtrl' };
custom_routes['/Order/list'] = { templateUrl: 'api/plugins/Interchange6/public/views/order_list.html', controller: 'OrderListRedirectCtrl' };
custom_routes['/Order/view/:id'] = { templateUrl: 'api/plugins/Interchange6/public/views/order.html', controller: 'OrderEditCtrl' };
custom_routes['/Order/view/:id'] = { templateUrl: 'api/plugins/Interchange6/public/views/order.html', controller: 'OrderEditCtrl' };

custom_routes['/Product/edit/:id'] = { templateUrl: 'api/plugins/Interchange6/public/views/product_form.html', controller: 'ProductEditCtrl' };

custom_routes['/Message/list'] = { templateUrl: 'api/plugins/Interchange6/public/views/message_list.html', controller: 'MessageListCtrl' };

var class_name = "Order";

CrudApp.factory('OrderListing', function($resource) { 
	return $resource('api/Order/all');
});

CrudApp.factory('OrderEdit', function($resource) { 
	return $resource('api/Order/edit');
});

CrudApp.factory('Order', function($resource) { 
	return $resource('api/Order/view');
});

var OrderEditCtrl = function ($scope, $rootScope, $routeParams, $location, Order, OrderEdit) {
	$scope.data = Order.get({ 
		id: $routeParams.id}
	);

	$scope.next = function(action){
		// Delete confirmation
		if(action == 'delete'){
			if(!confirm('Are you sure you want to delete this order?')){
				return 0;
			}
		} 
		
			OrderEdit.save({
				action: action,
				items: [$routeParams.id],
			},
			// Success
			function(data) {
				if($scope.data.next_order){
					$location.path('/Order/view/'+$scope.data.next_order);	
				}
				else {
					
					$location.path('/Order/list/all');	
				}
			});
	};
};


var OrderListRedirectCtrl = function ($scope, $location) {
	$location.path('/Order/list/all');	
	1;

}


var OrderListCtrl = function ($scope, $rootScope, $routeParams, Item, OrderListing, Url, OrderEdit) {
	$scope.title = $routeParams.type;
	$scope.types = [];
	$scope.item = {};
	$scope.item.values = {};

	$scope.data = {};
	$scope.data.sort_column = '';
	$scope.data.page_size = '';
	$scope.data.page_sizes = '';
	$scope.sort_desc = null;
	$scope.current_page = 1;
	
	$scope.search = function() {  
		
		var q = angular.copy($scope.item.values); 
		if($routeParams.type == 'all'){
			q.status = '';
		}
		else{
			q.status = $routeParams.type;
		}
		
		$scope.data = OrderListing.get({
			class: class_name,
			q: JSON.stringify(q),
			sort: $scope.data.sort_column, 
			descending: $scope.sort_desc ? 1 : 0,
			page: $scope.current_page,
			page_size: $scope.data.page_size,
			/*
			*/
			},
			// Success
			function(data) {
				$scope.types = [{type: 'all', label: 'All'}];
				$scope.types = $scope.types.concat(data.statuses);
				// Pagination
				var page_scope = 5;
				var current_page = $scope.data.page = parseInt($scope.data.page);
				var pages = $scope.data.pages = parseInt($scope.data.pages) ? parseInt($scope.data.pages) : 1;
				var from_page = (current_page - page_scope > 0) ? (current_page - page_scope) : 1;
				var to_page = (current_page + page_scope < pages) ? (current_page + page_scope) : pages;
		
				$scope.page_list = []; 
				for (var i = from_page; i <= to_page; i++) {
					$scope.page_list.push(i);
				}
			},
			// Error
			function(data) {
				alert('Error retrieving '+class_name);
			}
		);
	};
	
	$scope.sort = function (ord) {
		ord = ord.name;
		if ($scope.data.sort_column == ord) { $scope.sort_desc = !$scope.sort_desc; }
		else { $scope.sort_desc = false; }
		$scope.data.sort_column = ord;
		$scope.reset();
	};

	$scope.go_to_page = function (set_page) {
		$scope.current_page = parseInt(set_page);
		$scope.search();
	};
	$scope.reset = function () {
		$scope.current_page = 1;
		$scope.items = [];
		$scope.search();
	};
	
	$scope.check = function(target){
		$scope.checked = target; 
		switch(target) {
	    case 'all':
	    	angular.forEach($scope.data.rows, function (item) {
	            item.checked = true;
	        });
	        break;
	    case 'none':
	    	angular.forEach($scope.data.rows, function (item) {
	    		item.checked = false;
	    	});
	    	break;
	    default:
	    	angular.forEach($scope.data.rows, function (item) {
	    		if( target == item.columns.status ){
	    			item.checked = true;
	    		}
	    	});
	        break;
	    
		}
		
	};

	
	$scope.multi = function(action){
		// Delete confirmation
		if(action == 'delete'){
			if(!confirm('Are you sure you want to delete the checked orders?')){
				return 0;
			}
		} 

		// Selected
		var selected = [];
		angular.forEach($scope.data.rows, function (item) {
    		if( item.checked == true ){
    			selected.push(item.columns.orders_id);
    		}
    	});
		
		OrderEdit.save({
			action: action,
			items: selected,
		},
		// Success
		function(data) {
			$scope.reset();
		});
		
	};

	$scope.single = function(action, id){
		// Delete confirmation
		if(action == 'delete'){
			if(!confirm('Are you sure you want to delete this order?')){
				return 0;
			}
		} 
		
		OrderEdit.save({
			action: action,
			items: [id],
		},
		// Success
		function(data) {
			$scope.reset();
		});
	};
	
	$scope.reset();
};


var ProductEditCtrl = function ($scope, $rootScope, $routeParams, Item, ClassItem, Url, $upload, RelatedItems, RelatedItem) {
	$scope.error = {};
	$scope.item = Item.read.get({
			class: 'Product', 
			id: $routeParams.id
		},		
		// Success
		function(data) {
		},
		// Error
		function(data) {
			$scope.error.msg = 'Error retrieving '+'Product'+' with id '+$routeParams.id;
		}
	);
	$scope.data = ClassItem.get({class: 'Product'},
		// Success
		function(data) {
			// Pagination
			var page_scope = 5;			
			angular.forEach(data.relations, function(value, key){		
				value.foreign_id = $scope.item.values[value.self_column];
				value.id = $scope.item.id;
			});
		},
		// Error
		function(data) {
			$scope.error.msg = 'Error retrieving '+'Product'+' infrormation.';
		}
	);
	
	$scope.refresh_media = function(){
		$scope.media = RelatedItems.get({
			class: 'Product',
			id: $routeParams.id,
			related: 'media',
		});
	}

	$scope.save = Item.update;
	
	var column;
	var media_class_name = 'Media'
	$scope.media_class = ClassItem.get({class: media_class_name});
	$scope.onImageSelect = function($files) {
	    //$files: an array of files selected, each file has name, size, and type.
	    for (var i = 0; i < $files.length; i++) {
	      var file = $files[i];
	      
	      this.column = $scope.media_class.columns_info.file;
	      column = this.column.name;
	      

	      var filename = $scope.item.id+'_'+file.name; // Add sku to filename to make it item unique
	      $scope.upload = $upload.upload({
	        url: 'api/'+media_class_name+'/'+column+'/upload?filename='+filename,
	        data: {myObj: $scope.myModelObj},
	        file: file, // or list of files: $files for html5 only	        
	      }).progress(function(evt) {
	        console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
	      }).success(function(savedFilename, status, headers, config) {
	    	  // file is uploaded successfully
				var media = ClassItem.save({
					class: media_class_name,
					item: {
						values: {
							file: savedFilename,
							author_users_id: "1",
							media_types_id: "1",
						}
					},
				}, 
				// Success
				function(media_data) {
					var mp = ClassItem.save({
						class: 'MediaProduct',
							item: {
								values: {
									media_id: media_data.id,
									sku:  $routeParams.id,
								}
							},
						});
						$scope.refresh_media();
					});
				  });
				  //.error(...)
	    }
	};
	  
	$scope.removeMedia = function(media) {
		if (confirm('Do you really want to remove '+ media.name +' from '+this.item.title)){
			
			var row_id = media.id
			RelatedItem.remove({
				class: 'Product',
				id: $routeParams.id,
				related: 'media',
				related_id: media.id,
			},
			// Success
			function(data) {
				$('#media-'+row_id).fadeOut();
			},
			// Error
			function() {
				InfoBar.add('danger', 'Could not remove item!');
			});
		}  
	};
		
	$scope.related = Item.related_link;
	$scope.refresh_media();
};

var MessageListCtrl = function ($scope, $rootScope, $routeParams, $location, Class, ClassItem, Item, Url, InfoBar) {
	// $scope.data = Class.get({class: $routeParams.class});
	$scope.data = {};
	$scope.data.sort_column = '';
	$scope.data.page_size;
	$scope.data.page_sizes;
	$scope.item = {};
	$scope.item.values = {};
	$scope.sort_desc = null;
	$scope.current_page = 1;
	$scope.actions = $scope.actions || 'class_list';
	$scope.error = {};
	$routeParams.class = 'Message';

	$scope.sort = function (ord) {
		if(ord.foreign_column){
			ord = ord.foreign_column;
		}
		else{
			ord = ord.name;
		}
		if ($scope.data.sort_column == ord) { $scope.sort_desc = !$scope.sort_desc; }
		else { $scope.sort_desc = false; }
		$scope.data.sort_column = ord;
		$scope.reset();
	};

	$scope.go_to_page = function (set_page) {
		$scope.current_page = parseInt(set_page);
		$scope.search();
	};

	$scope.reset = function () {
		$scope.current_page = 1;
		$scope.items = [];
		$scope.search();
	};
	$scope.$on('listReset', function(){ $scope.reset()});

	$scope.del = Item.delete;


	$scope.create = function () {
		Url.edit = $location.path();
	};

	$scope.search = function() {    	

		$scope.data = Class.get({
			class: $routeParams.class,
			q: JSON.stringify($scope.item.values),
			sort: $scope.data.sort_column ? $scope.data.sort_column : '', 
			descending: $scope.sort_desc ? 1 : 0,
			page: $scope.current_page,
			page_size: $scope.data.page_size ? $scope.data.page_size : '',
		},
		// Success
		function(data) {
			// Pagination
			var page_scope = 5;
			var current_page = $scope.data.page = parseInt($scope.data.page);
			$scope.data.page_size = data.page_size;
			$scope.data.page_sizes = data.page_sizes;
			var pages = $scope.data.pages = parseInt($scope.data.pages) ? parseInt($scope.data.pages) : 1;
			var from_page = (current_page - page_scope > 0) ? (current_page - page_scope) : 1;
			var to_page = (current_page + page_scope < pages) ? (current_page + page_scope) : pages;
			$scope.data.sort_column = data.sort_column;
			$scope.sort_desc = data.sort_direction == 'DESC' ? true : false;

			$scope.page_list = []; 
			for (var i = from_page; i <= to_page; i++) {
				$scope.page_list.push(i);
			}
		},
		// Error
		function(data) {
			if(data.status == 403){
				$scope.error.msg = 'You don\'t have permission to view '+$routeParams.class+' items.';
			}
			else {
				$scope.error.msg = 'Error retrieving '+$routeParams.class+' items.';
			}
		}
		);
	};
	
	$scope.setFilterAndReset = function(field, value){
		$scope.item.values[field] = value
		$scope.reset();
	}

	$scope.reset();
};

