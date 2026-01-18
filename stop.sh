pid=`ps aux | grep ./node.js | awk '{print $2}'`
kill -9 $pid
