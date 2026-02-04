import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  label: string;
  placeholder: string;
  isPassword?: boolean;
  value: string;
  onChangeText: (text: string) => void;
}

export default function CustomInput({
  label,
  placeholder,
  isPassword = false,
  value,
  onChangeText,
}: Props) {
  const [secure, setSecure] = useState(isPassword);

  return (
    <View style={{ marginBottom: 12 }}>
      {/* Label */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          marginBottom: 4,
          color: '#1f2937',
        }}
      >
        {label}
      </Text>

      {/* Input + Icon */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#d1d5db',
          borderRadius: 12,
          paddingHorizontal: 16,
          height: 45,
          backgroundColor: '#ffffff',
        }}
      >
        <TextInput
          style={{ flex: 1, fontSize: 14, color: '#000000' }}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secure}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
        />

        {/* Toggle password */}
        {isPassword && (
          <TouchableOpacity onPress={() => setSecure(!secure)}>
            <Ionicons
              name={secure ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color="#6B7280"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
