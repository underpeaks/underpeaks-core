import 'dart:typed_data';
import 'package:flutter/material.dart';

class NxfMemoryImage extends StatelessWidget {
  final Uint8List bytes;
  final BoxFit fit;
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;

  const NxfMemoryImage({
    super.key,
    required this.bytes,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final image = Image.memory(
      bytes,
      fit: fit,
      width: width,
      height: height,
    );

    return borderRadius != null
        ? ClipRRect(borderRadius: borderRadius!, child: image)
        : image;
  }
}
