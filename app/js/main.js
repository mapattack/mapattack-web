(function(window,$,undefined){

  function filter(e) {
    var $el = $(this);
    var value = $el.val();
    var list = $('.boards.all');

    if (!value.length) {
      list.removeClass('filtering');
    } else {
      list.addClass('filtering');

      var items = list.find('li');
      var arr = $el.val().split(/\s+/);
      var values = '(?=.*' + arr.join(')(?=.*') + ')';
      var regex = new RegExp(values, 'i');

      items.each(function(){
        var item = $(this);
        var text = item.find('a').text();

        if (regex.exec(text)) {
          item.addClass('visible');
        } else {
          item.removeClass('visible');
        }
      });
    }
  }

  $(function(){
    $('input.search').on('keyup', filter);
  });

})(window,$);
