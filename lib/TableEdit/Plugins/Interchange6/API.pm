package TableEdit::Plugins::Interchange6::API;
use Dancer ':syntax';
use POSIX;
use Dancer::Plugin::DBIC qw(schema resultset rset);

prefix '/api';

sub schema_info {
	return TableEdit::Routes::API->schema_info;
}

sub order_rows {
	my ($rows, $columns_info, $primary_key) = @_;
	my @table_rows;
	
	for my $row (@$rows){
		die 'No primary column' unless $primary_key;
		my $rowInfo = schema_info->row($row);
		
		# unravel row
		my $row_inflated = {$row->get_columns}; #inflated_
		my $row_data = [];

		for my $column (@$columns_info){
			my $column_name = $column->{foreign} ? "$column->{foreign}" : "$column->{name}";
			my $value = $row->$column_name;
			if( index(ref $value, ref schema) == 0 ){ # If schema object
				$value = schema_info->row($value)->to_string; 
			} 
			elsif ( ref $value ) { # some other object
				$value = $row_inflated->{$column_name};
			}
			
			push @$row_data, {value => $value};
		}
		push @$row_data, {value => $row->orderlines->count};
		#push @$row_data, {user => $row->user->username};

		push @table_rows, {
            row => $row_data,
            id => $rowInfo->primary_key_string,
            name => $rowInfo->to_string,
            columns => $row_inflated,
        };
	}

	return \@table_rows;
}

get '/Order/all' =>  sub {
	my $class = 'Order';
	my $class_info = schema_info->class($class);
	#send_error("Forbidden to read ".param('class'), 403) unless permission('read', $class_info);
	my $grid_params = TableEdit::Routes::API::grid_template_params($class_info, undef, \&order_rows);
	$grid_params->{column_list} =  [@{$grid_params->{column_list}}, {
         "data_type" => "integer",
         "display_type" => "integer",
         "label" => "Items",
         name => 'items',
         "readonly" => 1,
      }];
	$grid_params->{statuses} = [map { {type => $_->status, label => ucfirst $_->status} } schema->resultset($class)->search(
	  { status => {'!=' => ''}},
	  {
	    columns => [ qw/status/ ],
	    distinct => 1
	  }
	)->all];
	
	return to_json($grid_params, {allow_unknown => 1});
};


get '/Order/view' => sub {
	my $id = params->{id};
	my $return;
	my $order = schema->resultset('Order')->find($id);
	my $next_order = schema->resultset('Order')->search({
		orders_id => {'>' => $id},
		status => {'!=' => 'archived'},
	},
	{
		order_by => [qw/ orders_id /]
	})->first;
	my $data = {$order->get_columns()};
	$data->{billing_address} = {$order->billing_address->get_columns} if $order->billing_address;
	$data->{shipping_address} = {$order->shipping_address->get_columns} if $order->shipping_address;
	$data->{user} = {$order->user->get_columns} if $order->user;
	$data->{items} = [map {{$_->get_columns}} $order->orderlines] if $order->orderlines;
	$return->{order} = $data;
	$return->{next_order} = $next_order->orders_id if $next_order;
	return to_json $return;
};


post '/Order/edit' => sub {
	my $body = from_json request->body;
	
	if($body->{action} eq 'delete'){
		for my $item (@{$body->{items}}){
			my $order = schema->resultset('Order')->find($item);
			$order->delete;
		}
		return 1;
	}
	elsif($body->{action} eq 'ship'){
		for my $item (@{$body->{items}}){
			my $order = schema->resultset('Order')->find($item);
			$order->status('shipped');
			$order->update;
		}
		return 1;
	}
	elsif($body->{action} eq 'archive'){
		for my $item (@{$body->{items}}){
			my $order = schema->resultset('Order')->find($item);
			$order->status('archived');
			$order->update;
		}
		return 1;
	}
	
	return undef;
};


post '/User/edit' => sub {
	my $body = from_json request->body;
	my $class = 'User';
	
	if($body->{action} eq 'delete'){
		for my $item (@{$body->{items}}){
			my $order = schema->resultset($class)->find($item);
			$order->delete;
		}
		return 1;
	}
	elsif($body->{action} eq 'activate'){
		for my $item (@{$body->{items}}){
			my $order = schema->resultset($class)->find($item);
			$order->active('1');
			$order->update;
		}
		return 1;
	}
	elsif($body->{action} eq 'deactivate'){
		for my $item (@{$body->{items}}){
			my $order = schema->resultset($class)->find($item);
			$order->active('0');
			$order->update;
		}
		return 1;
	}
	
	return undef;
};


post '/user' => sub {
	params->{item}->{values}->{username} = lc params->{item}->{values}->{username}; 
	pass;
};


post '/:class' => sub {
	debug "Validating ". params->{class}."...";
	pass;
};

1;
