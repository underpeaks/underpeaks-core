import 'package:flutter/cupertino.dart';

class NxfCupertinoDatePicker extends StatelessWidget {
  final DateTime initialDateTime;
  final ValueChanged<DateTime> onDateTimeChanged;

  const NxfCupertinoDatePicker({
    super.key,
    required this.initialDateTime,
    required this.onDateTimeChanged,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoDatePicker(
      initialDateTime: initialDateTime,
      mode: CupertinoDatePickerMode.dateAndTime,
      onDateTimeChanged: onDateTimeChanged,
    );
  }
}
