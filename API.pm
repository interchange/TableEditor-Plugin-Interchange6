package TableEdit::Plugins::Interchange6::API;
use Dancer ':syntax';
use POSIX;
use Dancer::Plugin::DBIC qw(schema resultset rset);
use Dancer::Plugin::Auth::Extensible;

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

        push @$row_data, { value => $row->orderlines->count },
          { value => $row->status };

		push @table_rows, {
            row => $row_data,
            id => $rowInfo->primary_key_string,
            name => $rowInfo->to_string,
            columns => $row_inflated,
        };
	}

	return \@table_rows;
}

get '/Order/all' => require_login sub {
	my $class = 'Order';
	my $class_info = schema_info->class($class);

    send_error( "Forbidden to read " . param('class'), 403 )
      unless permission( 'read', $class_info );

    # we cannot pass $class_info->resultset->with_status directly as 2nd arg
    # to grid_template_params so we assign to var 1st
    my $resultset = $class_info->resultset->with_status;
    my $grid_params =
      TableEdit::Routes::API::grid_template_params( $class_info,
        $resultset,
        \&order_rows );

    push @{ $grid_params->{column_list} },
      {
        data_type    => "integer",
        display_type => "integer",
        label        => "Items",
        name         => 'items',
        readonly     => 1,
      },
      {
        data_type    => "text",
        display_type => "text",
        label        => "Status",
        name         => 'status',
        readonly     => 1,
      };

	return to_json($grid_params, {allow_unknown => 1});
};


get '/Order/view' => require_login sub {
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


post '/Order/edit' => require_login sub {
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


post '/User/edit' => require_login sub {
	my $body = from_json request->body;
	my $class = 'User';
	
	if($body->{action} eq 'delete'){
		for my $item (@{$body->{items}}){
			my $user = schema->resultset($class)->find($item);
			$user->delete;
		}
		return 1;
	}
	elsif($body->{action} eq 'activate'){
		for my $item (@{$body->{items}}){
			my $user = schema->resultset($class)->find($item);
			$user->active('1');
			$user->update;
		}
		return 1;
	}
	elsif($body->{action} eq 'deactivate'){
		for my $item (@{$body->{items}}){
			my $user = schema->resultset($class)->find($item);
			$user->active('0');
			$user->update;
		}
		return 1;
	}
	elsif($body->{action} eq 'new_password'){
		for my $item (@{$body->{items}}){
			my $user = schema->resultset($class)->find($item);
			$user->password($body->{password});
			$user->update;
		}
		return 1;
	}
	
	return undef;
};


post '/User' => require_login sub {
	params->{item}->{values}->{username} = lc params->{item}->{values}->{username}; 
	pass;
};


post '/Media' => require_login sub {
	
	# Add MediaType and user to image upload
	my $req = request;
	my $body = from_json request->body;
	my $item = $body->{'item'};
	if($item->{image_upload}){
		my $user = schema->resultset('User')->find({username => session('logged_in_user')}) || schema->resultset('User')->find({}, {order_by => 'users_id'});		
		return to_json {error => 'Logged in user not find in db'} unless $user;
		my $media_type = schema->resultset('MediaType')->find({type => 'image'});
		return to_json {error => 'Image media type does not exist'} unless $media_type;
		$item->{values}->{author_users_id} = $user->users_id;
		$item->{values}->{media_types_id} = $media_type->media_types_id;
	} 
	$req->{body} = to_json $body;
	
	pass;
};

1;
