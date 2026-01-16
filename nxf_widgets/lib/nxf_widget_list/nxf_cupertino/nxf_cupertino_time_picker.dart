import 'package:flutter/cupertino.dart';

class NxfCupertinoTimePicker extends StatelessWidget {
  final DateTime initialDateTime;
  final ValueChanged<DateTime> onDateTimeChanged;
  final DateTime? minimumDate;
  final DateTime? maximumDate;

  const NxfCupertinoTimePicker({
    super.key,
    required this.initialDateTime,
    required this.onDateTimeChanged,
    this.minimumDate,
    this.maximumDate,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoDatePicker(
      mode: CupertinoDatePickerMode.time,
      initialDateTime: initialDateTime,
      onDateTimeChanged: onDateTimeChanged,
      minimumDate: minimumDate,
      maximumDate: maximumDate,
    );
  }
}
