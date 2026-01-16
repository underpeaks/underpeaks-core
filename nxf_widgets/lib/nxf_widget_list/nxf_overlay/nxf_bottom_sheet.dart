import 'package:flutter/material.dart';

class NxfBottomSheet {
  static void show(BuildContext context, Widget child) {
    showModalBottomSheet(
      context: context,
      builder: (context) => child,
    );
  }
}
