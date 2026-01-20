pid=`ps aux | grep node | awk '{print $2}'`
kill -9 $pid
